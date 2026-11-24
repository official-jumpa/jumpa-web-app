import { nextAutoSaveRun } from "@/lib/auto-save-schedule";
import { connectDB } from "@/lib/db";
import { createNotification } from "@/lib/functions/notificationFunctions";
import {
  getUserActiveNgnSavings,
  getUserActiveUsdcSavings,
  moveNgnIntoPlan,
} from "@/lib/functions/savingsFunctions";
import {
  assertDailyTransactionLimit,
  isLimitError,
} from "@/lib/functions/transactionLimitFunctions";
import { findWalletForUser } from "@/lib/functions/walletFunctions";
import {
  AUTO_SAVE_CURRENCIES,
  formatAutoSaveAmount,
  toCurrencyPrecision,
} from "@/lib/savings-auto-save";
import type { SavingsCurrency } from "@/lib/savings-hub";
import { autoSaveBlocker, roomToTarget } from "@/lib/services/auto-save";
import {
  moveUsdcIntoPlan,
  UsdcDepositError,
  unlockStellarKeypair,
} from "@/lib/services/savings-usdc";
import { formatOneLineError } from "@/lib/utils/api-best-practices";
import { AutoSaveRule, type IAutoSaveRule } from "@/models/AutoSaveRule";
import { type ISavingsPlan, SavingsPlan } from "@/models/SavingsPlan";
import { User } from "@/models/User";

/** Runs every auto-save rule that is due. Called by `npm run auto-save`, never from a request. */

const BATCH_SIZE = 50;
/** Naira runs are a few DB writes; USDC runs wait on the Stellar network, so fewer go at once. */
const CONCURRENCY: Record<SavingsCurrency, number> = { NGN: 5, USDC: 4 };
/** Naira first: it takes milliseconds and should never queue behind on-chain runs. */
const CURRENCY_ORDER: readonly SavingsCurrency[] = ["NGN", "USDC"];
/** Failed runs in a row before a rule pauses itself instead of retrying forever. */
const MAX_FAILED_RUNS = 3;

const WALLET_NAME: Record<SavingsCurrency, string> = {
  NGN: "Naira wallet",
  USDC: "USDC wallet",
};

const ACTIVE_SAVINGS: Record<
  SavingsCurrency,
  (userId: string) => Promise<number>
> = {
  NGN: getUserActiveNgnSavings,
  USDC: getUserActiveUsdcSavings,
};

type RunOutcome = "saved" | "failed" | "ended" | "skipped" | "unconfirmed";
export type AutoSaveRunSummary = Record<RunOutcome, number>;

/** `unconfirmed`: sent but not confirmed, so it may still land and must not be retried as a miss. */
type Moved =
  | { ok: true; plan: ISavingsPlan }
  | { ok: false; reason: string; unconfirmed?: boolean };

type Mover = (
  rule: IAutoSaveRule,
  plan: ISavingsPlan,
  amount: number,
) => Promise<Moved>;

export async function runDueAutoSaves(
  now = new Date(),
): Promise<AutoSaveRunSummary> {
  await connectDB();
  const summary: AutoSaveRunSummary = {
    saved: 0,
    failed: 0,
    ended: 0,
    skipped: 0,
    unconfirmed: 0,
  };
  for (const currency of CURRENCY_ORDER) {
    await runDueInCurrency(currency, now, summary);
  }
  return summary;
}

async function runDueInCurrency(
  currency: SavingsCurrency,
  now: Date,
  summary: AutoSaveRunSummary,
) {
  // Every rule handled here moves its nextRunAt past `now`, so each page is new work.
  for (;;) {
    const due = await AutoSaveRule.find({
      paused: false,
      currency,
      nextRunAt: { $lte: now },
    })
      .sort({ nextRunAt: 1 })
      .limit(BATCH_SIZE)
      .lean<IAutoSaveRule[]>();

    await eachWithLimit(
      queuesByUser(due),
      CONCURRENCY[currency],
      async (queue) => {
        for (const rule of queue) summary[await claimAndRun(rule, now)] += 1;
      },
    );
    if (due.length < BATCH_SIZE) return;
  }
}

/** One saver's rules run one after another: a Stellar account cannot send two at once. */
function queuesByUser(rules: IAutoSaveRule[]): IAutoSaveRule[][] {
  const queues = new Map<string, IAutoSaveRule[]>();
  for (const rule of rules) {
    queues.set(rule.userId, [...(queues.get(rule.userId) ?? []), rule]);
  }
  return [...queues.values()];
}

/** Runs `task` over `items`, at most `limit` at a time. */
async function eachWithLimit<T>(
  items: T[],
  limit: number,
  task: (item: T) => Promise<void>,
) {
  let next = 0;
  const worker = async () => {
    while (next < items.length) await task(items[next++]);
  };
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, worker),
  );
}

/**
 * Moves the rule to its next slot before any money moves. Only the runner
 * whose update lands goes on, so two overlapping jobs never save twice.
 */
async function claimAndRun(
  rule: IAutoSaveRule,
  now: Date,
): Promise<RunOutcome> {
  let nextRunAt: Date;
  try {
    nextRunAt = nextAutoSaveRun(rule, now, rule.nextRunAt);
  } catch {
    await AutoSaveRule.updateOne(
      { _id: rule._id },
      { $set: { paused: true, lastError: "Schedule could not be worked out" } },
    );
    return "failed";
  }

  const claim = await AutoSaveRule.updateOne(
    { _id: rule._id, paused: false, nextRunAt: rule.nextRunAt },
    { $set: { nextRunAt } },
  );
  if (claim.modifiedCount === 0) return "skipped";

  try {
    return await runRule(rule, now);
  } catch (err) {
    console.error(
      `[AutoSave] Rule ${rule._id} crashed: ${formatOneLineError(err)}`,
    );
    return recordFailure(rule, "Something went wrong on our side", now);
  }
}

async function runRule(rule: IAutoSaveRule, now: Date): Promise<RunOutcome> {
  const [plan, user] = await Promise.all([
    SavingsPlan.findById(rule.planId).lean<ISavingsPlan>(),
    User.findById(rule.userId).select("status").lean<{ status?: string }>(),
  ]);

  // Closed, withdrawn or no longer eligible: the rule has nothing to feed.
  if (!plan || autoSaveBlocker(plan, rule.userId)) {
    await AutoSaveRule.deleteOne({ _id: rule._id });
    return "ended";
  }
  // A missing status is an older row and counts as active.
  if (user?.status && user.status !== "active") return "skipped";

  const { currency } = plan;
  const amount = toCurrencyPrecision(
    Math.min(rule.amount, roomToTarget(plan)),
    currency,
  );
  if (amount <= 0) return endAtTarget(rule, plan);

  const { cap } = AUTO_SAVE_CURRENCIES[currency];
  if (amount > cap - (await ACTIVE_SAVINGS[currency](rule.userId))) {
    return recordFailure(
      rule,
      `You've reached the ${formatAutoSaveAmount(cap, currency)} savings limit`,
      now,
      plan,
    );
  }

  try {
    await assertDailyTransactionLimit({
      userId: rule.userId,
      amount,
      tokenOrCurrency: currency,
    });
  } catch (err) {
    if (!isLimitError(err)) throw err;
    const reason =
      err instanceof Error ? err.message : "Daily transaction limit reached";
    return recordFailure(rule, reason, now, plan);
  }

  const moved = await MOVERS[currency](rule, plan, amount);
  if (!moved.ok) {
    return moved.unconfirmed
      ? recordUnconfirmed(rule, now)
      : recordFailure(rule, moved.reason, now, plan);
  }

  await AutoSaveRule.updateOne(
    { _id: rule._id },
    {
      $set: {
        lastRunAt: now,
        lastOutcome: "saved",
        lastError: null,
        failedRuns: 0,
      },
    },
  );
  await notify(rule, plan, {
    tab: "transactions",
    title: "Auto-save complete",
    body: `${formatAutoSaveAmount(amount, currency)} moved from your ${WALLET_NAME[currency]} to ${plan.name}.`,
  });

  if (toCurrencyPrecision(roomToTarget(moved.plan), currency) <= 0) {
    await endAtTarget(rule, moved.plan);
  }
  return "saved";
}

const moveNaira: Mover = async (rule, plan, amount) => {
  try {
    const updated = await moveNgnIntoPlan({
      userId: rule.userId,
      walletId: plan.walletId,
      planId: plan._id,
      amount,
      via: "autosave",
    });
    return { ok: true, plan: updated };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      reason: /insufficient/i.test(message)
        ? "Not enough Naira in your wallet"
        : message,
    };
  }
};

const USDC_REASONS: Record<
  Exclude<UsdcDepositError["kind"], "unconfirmed">,
  string
> = {
  insufficient: "Not enough USDC in your wallet",
  unavailable: "We couldn't check your USDC balance",
  build: "Our savings partner didn't respond",
  rejected: "The Stellar network didn't accept the deposit",
};

/** Signs with the saver's own keys, unlocked without a PIN; Jumpa covers the gas. */
const moveUsdc: Mover = async (rule, plan, amount) => {
  const wallet = await findWalletForUser(rule.userId);
  if (!wallet) return { ok: false, reason: "Wallet not found" };
  const keypair = unlockStellarKeypair(wallet);
  if (!keypair) {
    return {
      ok: false,
      reason: "Confirm this auto-save with your PIN again",
    };
  }

  try {
    const deposit = await moveUsdcIntoPlan({
      userId: rule.userId,
      walletId: wallet._id,
      stellarAddress: wallet.addresses?.xlm || wallet.address,
      keypair,
      planId: plan._id,
      amount,
      via: "autosave",
      chargeGasFee: false,
    });
    return { ok: true, plan: deposit.plan };
  } catch (err) {
    if (!(err instanceof UsdcDepositError)) throw err;
    if (err.kind === "unconfirmed") {
      return { ok: false, reason: err.message, unconfirmed: true };
    }
    return { ok: false, reason: USDC_REASONS[err.kind] };
  }
};

const MOVERS: Record<SavingsCurrency, Mover> = {
  NGN: moveNaira,
  USDC: moveUsdc,
};

/** A plan that hits its target ends its rule. */
async function endAtTarget(
  rule: IAutoSaveRule,
  plan: ISavingsPlan,
): Promise<RunOutcome> {
  await AutoSaveRule.deleteOne({ _id: rule._id });
  await notify(rule, plan, {
    tab: "activities",
    title: "Savings goal reached",
    body: `${plan.name} has reached its target, so auto-save is now off.`,
  });
  return "ended";
}

/** Sent but not confirmed: no notice and no strike. If it lands, the resolver credits the plan. */
async function recordUnconfirmed(
  rule: IAutoSaveRule,
  now: Date,
): Promise<RunOutcome> {
  await AutoSaveRule.updateOne(
    { _id: rule._id },
    { $set: { lastRunAt: now, lastError: null } },
  );
  return "unconfirmed";
}

/** Tells the saver on the first miss and pauses the rule once misses pile up. */
async function recordFailure(
  rule: IAutoSaveRule,
  reason: string,
  now: Date,
  plan?: ISavingsPlan,
): Promise<RunOutcome> {
  const failedRuns = rule.failedRuns + 1;
  const pausing = failedRuns >= MAX_FAILED_RUNS;
  await AutoSaveRule.updateOne(
    { _id: rule._id },
    {
      $set: {
        lastRunAt: now,
        lastOutcome: "failed",
        lastError: reason,
        failedRuns,
        ...(pausing ? { paused: true } : {}),
      },
    },
  );

  const amount = formatAutoSaveAmount(rule.amount, rule.currency);
  const planName = plan?.name ?? "your plan";
  if (pausing) {
    await notify(rule, plan, {
      tab: "activities",
      title: "Auto-save paused",
      body: `We couldn't save ${amount} into ${planName} ${MAX_FAILED_RUNS} times in a row (${reason}). Turn it back on from the plan.`,
    });
  } else if (failedRuns === 1) {
    await notify(rule, plan, {
      tab: "transactions",
      title: "Auto-save missed",
      body: `We couldn't save ${amount} into ${planName}: ${reason}. We'll try again at the next run.`,
    });
  }
  return "failed";
}

/** A notice that fails to send is logged, never thrown: the run itself already happened. */
async function notify(
  rule: IAutoSaveRule,
  plan: ISavingsPlan | undefined,
  message: { tab: "transactions" | "activities"; title: string; body: string },
) {
  try {
    await createNotification({
      userId: rule.userId,
      type: "AUTO_SAVE",
      link: "/savings",
      metadata: { ruleId: rule._id, planId: plan?._id ?? rule.planId },
      ...message,
    });
  } catch (err) {
    console.warn(
      `[AutoSave] Notice for rule ${rule._id} not sent: ${formatOneLineError(err)}`,
    );
  }
}
