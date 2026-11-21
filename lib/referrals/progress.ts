import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { createNotification } from "@/lib/functions/notificationFunctions";
import { recordUserActivity } from "@/lib/functions/userFunctions";
import { KYC_VERIFIED_FILTER } from "@/lib/kyc";
import {
  type CampaignWindow,
  getCampaignWindow,
  isInCampaign,
} from "@/lib/referrals/campaign";
import { firstName } from "@/lib/referrals/names";
import {
  formatRewardNaira,
  QUALIFYING_TRANSACTION,
  REFERRAL_REWARD_NGN,
} from "@/lib/referrals/rules";
import { formatOneLineError } from "@/lib/utils/api-best-practices";
import { KYCSchema } from "@/models/KYCSchema";
import { type IReferral, Referral } from "@/models/Referral";
import { ReferralReward } from "@/models/ReferralReward";
import { Transaction } from "@/models/Transaction";
import { type IUser, User } from "@/models/User";

/**
 * Moves referrals through joined → kyc_verified → rewarded. Runs when a
 * referred user passes KYC or completes a ramp (`checkReferralSoon`), and on
 * a cron (`sweepReferrals`) that catches anything those hooks missed.
 */

export type ReferralOutcome =
  | "not_referred"
  | "outside_campaign"
  | "already_rewarded"
  | "awaiting_kyc"
  | "awaiting_transaction"
  | "rewarded";

export type ReferralDeps = {
  connect: () => Promise<unknown>;
  now: () => Date;
  campaign: () => CampaignWindow;
  /** Tells both sides; runs after the rewards are saved. */
  notifyRewarded: (referral: IReferral) => Promise<void>;
};

export const defaultReferralDeps: ReferralDeps = {
  connect: connectDB,
  now: () => new Date(),
  campaign: getCampaignWindow,
  notifyRewarded: notifyBothSides,
};

/** What is already known about a referred user, so a batch can skip the lookups. */
type KnownFacts = { kycVerified?: boolean; qualifyingTxId?: string | null };

const SWEEP_BATCH_SIZE = 200;

/** Re-checks one referred user without blocking the caller. No-op while the campaign is off. */
export function checkReferralSoon(
  referredUserId: string | null | undefined,
): void {
  if (!referredUserId || !getCampaignWindow().start) return;
  evaluateReferral(referredUserId).catch((err) =>
    console.warn(
      `[Referrals] Check for ${referredUserId} failed: ${formatOneLineError(err)}`,
    ),
  );
}

export async function evaluateReferral(
  referredUserId: string,
  deps: ReferralDeps = defaultReferralDeps,
): Promise<ReferralOutcome> {
  await deps.connect();
  const referral = await Referral.findOne({ referredUserId }).lean<IReferral>();
  if (!referral) return "not_referred";
  return advanceReferral(referral, deps);
}

async function advanceReferral(
  referral: IReferral,
  deps: ReferralDeps,
  known: KnownFacts = {},
): Promise<ReferralOutcome> {
  if (referral.status === "rewarded") return "already_rewarded";
  const window = deps.campaign();
  if (!isInCampaign(window, referral.createdAt)) return "outside_campaign";

  if (referral.status === "joined") {
    const verified =
      known.kycVerified ??
      Boolean(
        await KYCSchema.exists({
          userId: referral.referredUserId,
          ...KYC_VERIFIED_FILTER,
        }),
      );
    if (!verified) return "awaiting_kyc";
    await Referral.updateOne(
      { _id: referral._id, status: "joined" },
      { $set: { status: "kyc_verified", kycVerifiedAt: deps.now() } },
    );
  }

  const txId =
    known.qualifyingTxId !== undefined
      ? known.qualifyingTxId
      : (await findQualifyingTransactions([referral.referredUserId])).get(
          referral.referredUserId,
        );
  if (!txId) return "awaiting_transaction";
  if (!isInCampaign(window, deps.now())) return "outside_campaign";

  return (await grantReferralRewards(referral, txId, deps))
    ? "rewarded"
    : "already_rewarded";
}

/**
 * Each user's earliest completed ramp that meets the rule, keyed by user id.
 * `amount` is stored as a string, so it is converted before comparing.
 */
export async function findQualifyingTransactions(
  userIds: string[],
): Promise<Map<string, string>> {
  if (userIds.length === 0) return new Map();
  const rows = await Transaction.aggregate<{ _id: string; txId: string }>([
    {
      $match: {
        userId: { $in: userIds },
        type: { $in: [...QUALIFYING_TRANSACTION.types] },
        status: "CONFIRMED",
        network: "mainnet",
        token: {
          $in: QUALIFYING_TRANSACTION.tokens.map(
            (t) => new RegExp(`^${t}$`, "i"),
          ),
        },
      },
    },
    {
      $addFields: {
        numericAmount: {
          $convert: {
            input: {
              $replaceAll: { input: "$amount", find: ",", replacement: "" },
            },
            to: "double",
            onError: 0,
            onNull: 0,
          },
        },
      },
    },
    { $match: { numericAmount: { $gte: QUALIFYING_TRANSACTION.minAmount } } },
    { $sort: { createdAt: 1 } },
    { $group: { _id: "$userId", txId: { $first: "$_id" } } },
  ]);
  return new Map(rows.map((row) => [row._id, row.txId]));
}

/** Pays both sides once. False when another run already paid this referral. */
async function grantReferralRewards(
  referral: IReferral,
  qualifyingTxId: string,
  deps: ReferralDeps,
): Promise<boolean> {
  const rewardedAt = deps.now();
  let granted = false;
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      granted = false;
      const claimed = await Referral.updateOne(
        { _id: referral._id, status: { $ne: "rewarded" } },
        { $set: { status: "rewarded", rewardedAt, qualifyingTxId } },
        { session },
      );
      if (claimed.modifiedCount === 0) return;
      await ReferralReward.create(
        [
          {
            userId: referral.referrerId,
            referralId: referral._id,
            role: "referrer",
            amount: REFERRAL_REWARD_NGN.referrer,
          },
          {
            userId: referral.referredUserId,
            referralId: referral._id,
            role: "referred",
            amount: REFERRAL_REWARD_NGN.referred,
          },
        ],
        { session, ordered: true },
      );
      granted = true;
    });
  } catch (err) {
    // The unique {referralId, role} index: a concurrent run paid it first.
    if ((err as { code?: number })?.code === 11000) return false;
    throw err;
  } finally {
    await session.endSession();
  }

  if (granted) {
    await deps
      .notifyRewarded({
        ...referral,
        status: "rewarded",
        rewardedAt,
        qualifyingTxId,
      })
      .catch((err) =>
        console.warn(
          `[Referrals] Rewarded ${referral._id} but could not notify: ${formatOneLineError(err)}`,
        ),
      );
  }
  return granted;
}

async function notifyBothSides(referral: IReferral): Promise<void> {
  const friend = await User.findById(
    referral.referredUserId,
    "name jumpaTag",
  ).lean<Pick<IUser, "name" | "jumpaTag">>();
  const friendName = firstName(friend) ?? "Your friend";
  const sides = [
    {
      userId: referral.referrerId,
      role: "referrer",
      amount: REFERRAL_REWARD_NGN.referrer,
      title: "Referral reward earned",
      body: `${friendName} made their first trade. ${formatRewardNaira(REFERRAL_REWARD_NGN.referrer)} is ready to claim.`,
    },
    {
      userId: referral.referredUserId,
      role: "referred",
      amount: REFERRAL_REWARD_NGN.referred,
      title: "Welcome reward earned",
      body: `You earned ${formatRewardNaira(REFERRAL_REWARD_NGN.referred)} for joining with a friend's invite. Claim it from Referrals.`,
    },
  ] as const;

  await Promise.all(
    sides.flatMap((side) => [
      createNotification({
        userId: side.userId,
        tab: "activities",
        type: "REFERRAL_REWARD",
        title: side.title,
        body: side.body,
        metadata: {
          referralId: referral._id,
          role: side.role,
          amount: side.amount,
        },
        link: "/referrals",
      }),
      recordUserActivity({
        userId: side.userId,
        action: "REFERRAL_REWARDED",
        details: {
          referralId: referral._id,
          role: side.role,
          amount: side.amount,
          qualifyingTxId: referral.qualifyingTxId,
        },
      }),
    ]),
  );
}

export type SweepSummary = {
  checked: number;
  rewarded: number;
  awaitingKyc: number;
  awaitingTransaction: number;
  failed: number;
};

/** Walks every unrewarded referral from the campaign in batches. Safe to run concurrently. */
export async function sweepReferrals(
  deps: ReferralDeps = defaultReferralDeps,
): Promise<SweepSummary> {
  const summary: SweepSummary = {
    checked: 0,
    rewarded: 0,
    awaitingKyc: 0,
    awaitingTransaction: 0,
    failed: 0,
  };
  const window = deps.campaign();
  if (!window.start || !isInCampaign(window, deps.now())) return summary;
  await deps.connect();

  // A row whose status changes mid-walk can come round twice; granting is idempotent.
  const cursor = Referral.find({
    status: { $in: ["joined", "kyc_verified"] },
    createdAt: {
      $gte: window.start,
      ...(window.end ? { $lt: window.end } : {}),
    },
  })
    .sort({ createdAt: 1 })
    .lean<IReferral[]>()
    .cursor({ batchSize: SWEEP_BATCH_SIZE });

  let batch: IReferral[] = [];
  for await (const referral of cursor) {
    batch.push(referral as IReferral);
    if (batch.length === SWEEP_BATCH_SIZE) {
      await sweepBatch(batch, deps, summary);
      batch = [];
    }
  }
  if (batch.length > 0) await sweepBatch(batch, deps, summary);
  return summary;
}

/** Two queries for the whole batch, then one write per referral that moves. */
async function sweepBatch(
  batch: IReferral[],
  deps: ReferralDeps,
  summary: SweepSummary,
): Promise<void> {
  const joinedIds = batch
    .filter((r) => r.status === "joined")
    .map((r) => r.referredUserId);
  const verified = new Set<string>(
    joinedIds.length > 0
      ? await KYCSchema.distinct("userId", {
          userId: { $in: joinedIds },
          ...KYC_VERIFIED_FILTER,
        })
      : [],
  );
  const candidates = batch.filter(
    (r) => r.status === "kyc_verified" || verified.has(r.referredUserId),
  );
  const qualifying = await findQualifyingTransactions(
    candidates.map((r) => r.referredUserId),
  );

  for (const referral of batch) {
    summary.checked += 1;
    try {
      const outcome = await advanceReferral(referral, deps, {
        kycVerified:
          referral.status === "kyc_verified" ||
          verified.has(referral.referredUserId),
        qualifyingTxId: qualifying.get(referral.referredUserId) ?? null,
      });
      if (outcome === "rewarded") summary.rewarded += 1;
      else if (outcome === "awaiting_kyc") summary.awaitingKyc += 1;
      else if (outcome === "awaiting_transaction")
        summary.awaitingTransaction += 1;
    } catch (err) {
      summary.failed += 1;
      console.error(
        `[Referrals] Sweep could not advance ${referral._id}: ${formatOneLineError(err)}`,
      );
    }
  }
}
