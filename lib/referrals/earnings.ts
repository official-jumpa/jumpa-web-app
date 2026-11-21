import mongoose, { type ClientSession } from "mongoose";
import { connectDB } from "@/lib/db";
import { atomicCreditNgnBalance } from "@/lib/functions/aellaFunctions";
import { createNotification } from "@/lib/functions/notificationFunctions";
import { recordUserActivity } from "@/lib/functions/userFunctions";
import { formatRewardNaira } from "@/lib/referrals/rules";
import { generateId } from "@/lib/schema-ids";
import { formatOneLineError } from "@/lib/utils/api-best-practices";
import { NgnAccount } from "@/models/NgnAccount";
import { ReferralReward } from "@/models/ReferralReward";

export type ReferralEarnings = {
  /** Everything ever earned, in naira. */
  total: number;
  /** Earned but not yet moved into the Naira wallet. */
  available: number;
  claimed: number;
};

export async function getReferralEarnings(
  userId: string,
): Promise<ReferralEarnings> {
  await connectDB();
  const rows = await ReferralReward.aggregate<{
    _id: "available" | "claimed";
    sum: number;
  }>([
    { $match: { userId } },
    {
      $group: {
        _id: { $cond: [{ $eq: ["$claimId", null] }, "available", "claimed"] },
        sum: { $sum: "$amount" },
      },
    },
  ]);
  const available = rows.find((r) => r._id === "available")?.sum ?? 0;
  const claimed = rows.find((r) => r._id === "claimed")?.sum ?? 0;
  return { total: available + claimed, available, claimed };
}

/** A Naira account that can receive the claim; the credit would otherwise create a bare one. */
export async function hasClaimableNairaAccount(
  userId: string,
): Promise<boolean> {
  await connectDB();
  const account = await NgnAccount.exists({
    userId,
    provider: "aella",
    status: "active",
    accountNumber: { $type: "string", $ne: "" },
  });
  return Boolean(account);
}

export type ReferralClaimErrorCode = "NO_NAIRA_ACCOUNT" | "NOTHING_TO_CLAIM";

export class ReferralClaimError extends Error {
  constructor(
    readonly code: ReferralClaimErrorCode,
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

type CreditNaira = (credit: {
  userId: string;
  amount: number;
  claimId: string;
  session: ClientSession;
}) => Promise<number>;

export type ClaimDeps = {
  connect: () => Promise<unknown>;
  now: () => Date;
  hasNairaAccount: (userId: string) => Promise<boolean>;
  /** Adds the amount to the Naira balance inside the claim's transaction; returns the new balance. */
  creditNaira: CreditNaira;
  notifyClaimed: (
    userId: string,
    amount: number,
    claimId: string,
  ) => Promise<void>;
};

export const defaultClaimDeps: ClaimDeps = {
  connect: connectDB,
  now: () => new Date(),
  hasNairaAccount: hasClaimableNairaAccount,
  creditNaira: ({ userId, amount, claimId, session }) =>
    atomicCreditNgnBalance({
      userId,
      amount,
      reference: claimId,
      eventId: claimId,
      memo: `Referral earnings (${formatRewardNaira(amount)})`,
      senderName: "Jumpa Referral Rewards",
      senderBank: "Jumpa Rewards",
      session,
    }).then((res) => res.newBalance),
  notifyClaimed,
};

export type ReferralClaim = {
  claimId: string;
  amount: number;
  newBalance: number;
};

/** Moves every unclaimed reward into the Naira wallet in one transaction. */
export async function claimReferralEarnings(
  userId: string,
  deps: ClaimDeps = defaultClaimDeps,
): Promise<ReferralClaim> {
  await deps.connect();
  if (!(await deps.hasNairaAccount(userId))) {
    throw new ReferralClaimError(
      "NO_NAIRA_ACCOUNT",
      409,
      "Create your Naira account first, then claim your earnings into it.",
    );
  }

  const claimId = generateId("rclm");
  let result: ReferralClaim | null = null;
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      result = null;
      const rewards = await ReferralReward.find(
        { userId, claimId: null },
        "_id amount",
      )
        .session(session)
        .lean<{ _id: string; amount: number }[]>();
      if (rewards.length === 0) return;

      const amount = rewards.reduce((sum, r) => sum + r.amount, 0);
      const marked = await ReferralReward.updateMany(
        { _id: { $in: rewards.map((r) => r._id) }, claimId: null },
        { $set: { claimId, claimedAt: deps.now() } },
        { session },
      );
      // A concurrent claim took some of them; abort so nothing is paid twice.
      if (marked.modifiedCount !== rewards.length) {
        throw new ReferralClaimError(
          "NOTHING_TO_CLAIM",
          409,
          "This claim is already being processed.",
        );
      }
      const newBalance = await deps.creditNaira({
        userId,
        amount,
        claimId,
        session,
      });
      result = { claimId, amount, newBalance };
    });
  } finally {
    await session.endSession();
  }

  const claim = result as ReferralClaim | null;
  if (!claim) {
    throw new ReferralClaimError(
      "NOTHING_TO_CLAIM",
      400,
      "You have no referral earnings to claim yet.",
    );
  }
  await deps
    .notifyClaimed(userId, claim.amount, claim.claimId)
    .catch((err) =>
      console.warn(
        `[Referrals] Claim ${claim.claimId} paid but not notified: ${formatOneLineError(err)}`,
      ),
    );
  return claim;
}

async function notifyClaimed(
  userId: string,
  amount: number,
  claimId: string,
): Promise<void> {
  await Promise.all([
    createNotification({
      userId,
      tab: "transactions",
      type: "REFERRAL_CLAIMED",
      title: "Referral earnings claimed",
      body: `${formatRewardNaira(amount)} was added to your Naira wallet.`,
      metadata: { amount, token: "NGN", txHash: claimId },
      link: "/ngn-account",
    }),
    recordUserActivity({
      userId,
      action: "REFERRAL_EARNINGS_CLAIMED",
      details: { amount, claimId },
    }),
  ]);
}
