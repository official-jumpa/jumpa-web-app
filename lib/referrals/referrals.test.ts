import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import mongoose from "mongoose";
import { assertTestDatabase } from "@/lib/nimiq/test-db";

// The app's connectDB must never run here: with no URI it throws instead of reaching a real database.
process.env.MONGO_URI = "";

/** Throwaway database; rows are scoped by run id and never dropped. */
const TEST_MONGO_URI =
  process.env.REFERRAL_TEST_MONGO_URI ??
  "mongodb://127.0.0.1:27017/jumpa_referral_test?directConnection=true";
assertTestDatabase(TEST_MONGO_URI);

type Progress = typeof import("./progress");
type Earnings = typeof import("./earnings");

let progress: Progress;
let earnings: Earnings;
let models: {
  Referral: typeof import("@/models/Referral").Referral;
  ReferralReward: typeof import("@/models/ReferralReward").ReferralReward;
  KYCSchema: typeof import("@/models/KYCSchema").KYCSchema;
  Transaction: typeof import("@/models/Transaction").Transaction;
  NgnAccount: typeof import("@/models/NgnAccount").NgnAccount;
};
let connected = false;

const RUN = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
/** Each run gets its own campaign, so rows from earlier runs fall outside it. */
const CAMPAIGN_START = new Date();
const DAY = 86_400_000;
let seq = 0;
const uid = (label: string) => `${label}_${RUN}_${++seq}`;

const notified: string[] = [];
function referralDeps(
  overrides: Partial<import("./progress").ReferralDeps> = {},
): import("./progress").ReferralDeps {
  return {
    connect: async () => {},
    now: () => new Date(),
    campaign: () => ({ start: CAMPAIGN_START, end: null }),
    notifyRewarded: async (referral) => {
      notified.push(referral._id);
    },
    ...overrides,
  };
}

async function referral(opts: { createdAt?: Date } = {}) {
  const now = opts.createdAt ?? new Date();
  const doc = {
    _id: uid("refr"),
    referrerId: uid("referrer"),
    referrerCode: "RTEST1",
    referredUserId: uid("friend"),
    status: "joined",
    kycVerifiedAt: null,
    qualifyingTxId: null,
    rewardedAt: null,
    createdAt: now,
    updatedAt: now,
  };
  await models.Referral.collection.insertOne(doc as never);
  return doc;
}

async function passKyc(userId: string) {
  await models.KYCSchema.collection.insertOne({
    _id: uid("kyc"),
    userId,
    status: "approved",
    isCompleted: true,
  } as never);
}

async function ramp(
  userId: string,
  fields: Partial<{
    type: string;
    status: string;
    network: string;
    token: string;
    amount: string;
  }> = {},
) {
  const doc = {
    _id: uid("tx"),
    userId,
    type: "ONRAMP",
    status: "CONFIRMED",
    network: "mainnet",
    token: "USDC",
    amount: "10",
    createdAt: new Date(),
    ...fields,
  };
  await models.Transaction.collection.insertOne(doc as never);
  return doc._id;
}

const statusOf = async (id: string) =>
  (await models.Referral.findById(id).lean())?.status;

before(async () => {
  try {
    await mongoose.connect(TEST_MONGO_URI, { serverSelectionTimeoutMS: 2000 });
    connected = true;
  } catch {
    connected = false;
    return;
  }
  progress = await import("./progress");
  earnings = await import("./earnings");
  models = {
    Referral: (await import("@/models/Referral")).Referral,
    ReferralReward: (await import("@/models/ReferralReward")).ReferralReward,
    KYCSchema: (await import("@/models/KYCSchema")).KYCSchema,
    Transaction: (await import("@/models/Transaction")).Transaction,
    NgnAccount: (await import("@/models/NgnAccount")).NgnAccount,
  };
  // The unique {referralId, role} index is what makes concurrent grants safe.
  await models.ReferralReward.createIndexes();
  await models.Referral.createIndexes();
});

after(async () => {
  if (connected) await mongoose.disconnect();
});

describe("evaluateReferral", () => {
  test("ignores users nobody referred", async (t) => {
    if (!connected) return t.skip("no local MongoDB");
    assert.equal(
      await progress.evaluateReferral(uid("stranger"), referralDeps()),
      "not_referred",
    );
  });

  test("does not pay sign-ups from before the campaign", async (t) => {
    if (!connected) return t.skip("no local MongoDB");
    const r = await referral({
      createdAt: new Date(CAMPAIGN_START.getTime() - DAY),
    });
    await passKyc(r.referredUserId);
    await ramp(r.referredUserId);
    assert.equal(
      await progress.evaluateReferral(r.referredUserId, referralDeps()),
      "outside_campaign",
    );
    assert.equal(await statusOf(r._id), "joined");
  });

  test("waits for KYC, then for the trade", async (t) => {
    if (!connected) return t.skip("no local MongoDB");
    const r = await referral();
    assert.equal(
      await progress.evaluateReferral(r.referredUserId, referralDeps()),
      "awaiting_kyc",
    );
    assert.equal(await statusOf(r._id), "joined");

    await passKyc(r.referredUserId);
    assert.equal(
      await progress.evaluateReferral(r.referredUserId, referralDeps()),
      "awaiting_transaction",
    );
    assert.equal(await statusOf(r._id), "kyc_verified");
  });

  test("only a confirmed mainnet USDC/USDT ramp of $10 or more qualifies", async (t) => {
    if (!connected) return t.skip("no local MongoDB");
    const r = await referral();
    await passKyc(r.referredUserId);
    await ramp(r.referredUserId, { amount: "9.99" });
    await ramp(r.referredUserId, { status: "PENDING", amount: "50" });
    await ramp(r.referredUserId, { network: "testnet", amount: "50" });
    await ramp(r.referredUserId, { type: "SWAP", amount: "50" });
    await ramp(r.referredUserId, { token: "XLM", amount: "50" });
    assert.equal(
      await progress.evaluateReferral(r.referredUserId, referralDeps()),
      "awaiting_transaction",
    );

    const txId = await ramp(r.referredUserId, {
      type: "OFFRAMP",
      token: "usdt",
      amount: "10",
    });
    assert.equal(
      await progress.evaluateReferral(r.referredUserId, referralDeps()),
      "rewarded",
    );

    const saved = await models.Referral.findById(r._id).lean();
    assert.equal(saved?.status, "rewarded");
    assert.equal(saved?.qualifyingTxId, txId);
    const rewards = await models.ReferralReward.find({
      referralId: r._id,
    }).lean();
    assert.deepEqual(
      rewards.map((w) => [w.role, w.userId, w.amount, w.claimId]).sort(),
      [
        ["referred", r.referredUserId, 200, null],
        ["referrer", r.referrerId, 500, null],
      ],
    );
    assert.equal(notified.filter((id) => id === r._id).length, 1);
  });

  test("pays each referral once, even when checks race", async (t) => {
    if (!connected) return t.skip("no local MongoDB");
    const r = await referral();
    await passKyc(r.referredUserId);
    await ramp(r.referredUserId, { amount: "1,250.00" });

    const outcomes = await Promise.all(
      Array.from({ length: 5 }, () =>
        progress.evaluateReferral(r.referredUserId, referralDeps()),
      ),
    );
    assert.equal(outcomes.filter((o) => o === "rewarded").length, 1);
    assert.equal(
      await models.ReferralReward.countDocuments({ referralId: r._id }),
      2,
    );
    assert.equal(notified.filter((id) => id === r._id).length, 1);
    assert.equal(
      await progress.evaluateReferral(r.referredUserId, referralDeps()),
      "already_rewarded",
    );
  });

  test("grants nothing once the campaign has ended", async (t) => {
    if (!connected) return t.skip("no local MongoDB");
    const r = await referral();
    await passKyc(r.referredUserId);
    await ramp(r.referredUserId);
    const ended = referralDeps({
      campaign: () => ({
        start: CAMPAIGN_START,
        end: new Date(Date.now() + DAY),
      }),
      now: () => new Date(Date.now() + 2 * DAY),
    });
    assert.equal(
      await progress.evaluateReferral(r.referredUserId, ended),
      "outside_campaign",
    );
    assert.equal(
      await models.ReferralReward.countDocuments({ referralId: r._id }),
      0,
    );
  });
});

describe("sweepReferrals", () => {
  test("pays what the hooks missed and leaves the rest waiting", async (t) => {
    if (!connected) return t.skip("no local MongoDB");
    const ready = await referral();
    await passKyc(ready.referredUserId);
    await ramp(ready.referredUserId, { amount: "25" });
    const noKyc = await referral();
    await ramp(noKyc.referredUserId, { amount: "25" });
    const noTrade = await referral();
    await passKyc(noTrade.referredUserId);

    const summary = await progress.sweepReferrals(referralDeps());
    assert.ok(summary.rewarded >= 1);
    assert.equal(summary.failed, 0);
    assert.equal(await statusOf(ready._id), "rewarded");
    assert.equal(await statusOf(noKyc._id), "joined");
    assert.equal(await statusOf(noTrade._id), "kyc_verified");

    const again = await progress.sweepReferrals(referralDeps());
    assert.equal(again.rewarded, 0);
    assert.equal(
      await models.ReferralReward.countDocuments({ referralId: ready._id }),
      2,
    );
  });

  test("does nothing while the campaign is off", async (t) => {
    if (!connected) return t.skip("no local MongoDB");
    const off = referralDeps({ campaign: () => ({ start: null, end: null }) });
    assert.equal((await progress.sweepReferrals(off)).checked, 0);
  });
});

describe("claimReferralEarnings", () => {
  async function unclaimed(userId: string, amounts: number[]) {
    for (const amount of amounts) {
      await models.ReferralReward.create({
        userId,
        referralId: uid("refr"),
        role: "referrer",
        amount,
      });
    }
  }

  function claimDeps(
    credits: { userId: string; amount: number; claimId: string }[],
    overrides: Partial<import("./earnings").ClaimDeps> = {},
  ): import("./earnings").ClaimDeps {
    return {
      connect: async () => {},
      now: () => new Date(),
      hasNairaAccount: async () => true,
      creditNaira: async ({ userId, amount, claimId, session }) => {
        // Writes inside the claim's transaction, like the real credit.
        await models.NgnAccount.updateOne(
          { userId, currency: "NGN", provider: "aella" },
          { $inc: { balance: amount } },
          { upsert: true, session },
        );
        credits.push({ userId, amount, claimId });
        return amount;
      },
      notifyClaimed: async () => {},
      ...overrides,
    };
  }

  test("needs a Naira account to pay into", async (t) => {
    if (!connected) return t.skip("no local MongoDB");
    const userId = uid("user");
    await unclaimed(userId, [500]);
    await assert.rejects(
      earnings.claimReferralEarnings(
        userId,
        claimDeps([], { hasNairaAccount: async () => false }),
      ),
      { code: "NO_NAIRA_ACCOUNT" },
    );
    assert.equal(
      await models.ReferralReward.countDocuments({ userId, claimId: null }),
      1,
    );
  });

  test("moves every unclaimed reward once, then has nothing left", async (t) => {
    if (!connected) return t.skip("no local MongoDB");
    const userId = uid("user");
    await unclaimed(userId, [500, 500, 200]);
    const credits: { userId: string; amount: number; claimId: string }[] = [];

    const claim = await earnings.claimReferralEarnings(
      userId,
      claimDeps(credits),
    );
    assert.equal(claim.amount, 1200);
    assert.match(claim.claimId, /^rclm_/);
    assert.deepEqual(credits, [
      { userId, amount: 1200, claimId: claim.claimId },
    ]);
    assert.equal(
      await models.ReferralReward.countDocuments({
        userId,
        claimId: claim.claimId,
      }),
      3,
    );

    await assert.rejects(
      earnings.claimReferralEarnings(userId, claimDeps(credits)),
      {
        code: "NOTHING_TO_CLAIM",
      },
    );
  });

  test("pays once when claims race", async (t) => {
    if (!connected) return t.skip("no local MongoDB");
    const userId = uid("user");
    await unclaimed(userId, [500, 200]);
    const credits: { userId: string; amount: number; claimId: string }[] = [];

    const results = await Promise.allSettled(
      Array.from({ length: 4 }, () =>
        earnings.claimReferralEarnings(userId, claimDeps(credits)),
      ),
    );
    assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
    assert.equal(
      credits.reduce((sum, c) => sum + c.amount, 0),
      700,
    );
    const account = await models.NgnAccount.findOne({ userId }).lean<{
      balance: number;
    }>();
    assert.equal(account?.balance, 700);
  });

  test("keeps the rewards unclaimed when the credit fails", async (t) => {
    if (!connected) return t.skip("no local MongoDB");
    const userId = uid("user");
    await unclaimed(userId, [500]);
    const failing = claimDeps([], {
      creditNaira: async () => {
        throw new Error("ledger down");
      },
    });
    await assert.rejects(
      earnings.claimReferralEarnings(userId, failing),
      /ledger down/,
    );
    assert.equal(
      await models.ReferralReward.countDocuments({ userId, claimId: null }),
      1,
    );
  });
});
