import { nextAutoSaveRun } from "@/lib/auto-save-schedule";
import { connectDB } from "@/lib/db";
import { createNotification } from "@/lib/functions/notificationFunctions";
import {
  getUserActiveNgnSavings,
  moveNgnIntoPlan,
} from "@/lib/functions/savingsFunctions";
import {
  assertDailyTransactionLimit,
  isLimitError,
} from "@/lib/functions/transactionLimitFunctions";
import {
  AUTO_SAVE_CURRENCIES,
  formatAutoSaveAmount,
} from "@/lib/savings-auto-save";
import { autoSaveBlocker, roomToTarget } from "@/lib/services/auto-save";
import { formatOneLineError } from "@/lib/utils/api-best-practices";
import { AutoSaveRule, type IAutoSaveRule } from "@/models/AutoSaveRule";
import { type ISavingsPlan, SavingsPlan } from "@/models/SavingsPlan";
import { User } from "@/models/User";

/** Runs every auto-save rule that is due. Called by `npm run auto-save`, never from a request. */

const BATCH_SIZE = 50;
/** Rules run side by side; each is a few small DB writes. */
const CONCURRENCY = 5;
/** Failed runs in a row before a rule pauses itself instead of retrying forever. */
const MAX_FAILED_RUNS = 3;

type RunOutcome = "saved" | "failed" | "ended" | "skipped";
export type AutoSaveRunSummary = Record<RunOutcome, number>;

export async function runDueAutoSaves(
  now = new Date(),
): Promise<AutoSaveRunSummary> {
  await connectDB();
  const summary: AutoSaveRunSummary = {
    saved: 0,
    failed: 0,
    ended: 0,
    skipped: 0,
  };

  // Every rule handled here moves its nextRunAt past `now`, so each page is new work.
  for (;;) {
    const due = await AutoSaveRule.find({
      paused: false,
      nextRunAt: { $lte: now },
    })
      .sort({ nextRunAt: 1 })
      .limit(BATCH_SIZE)
      .lean<IAutoSaveRule[]>();

    for (let start = 0; start < due.length; start += CONCURRENCY) {
      const outcomes = await Promise.all(
        due
          .slice(start, start + CONCURRENCY)
          .map((rule) => claimAndRun(rule, now)),
      );
      for (const outcome of outcomes) summary[outcome] += 1;
    }
    if (due.length < BATCH_SIZE) return summary;
  }
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

  const room = roomToTarget(plan);
  if (room === 0) return endAtTarget(rule, plan);

  const amount = Math.min(rule.amount, room);
  const capRoom =
    AUTO_SAVE_CURRENCIES[plan.currency].cap -
    (await getUserActiveNgnSavings(rule.userId));
  if (amount > capRoom) {
    return recordFailure(
      rule,
      `You've reached the ${formatAutoSaveAmount(AUTO_SAVE_CURRENCIES[plan.currency].cap, plan.currency)} savings limit`,
      now,
      plan,
    );
  }

  try {
    await assertDailyTransactionLimit({
      userId: rule.userId,
      amount,
      tokenOrCurrency: plan.currency,
    });
  } catch (err) {
    if (!isLimitError(err)) throw err;
    const reason =
      err instanceof Error ? err.message : "Daily transaction limit reached";
    return recordFailure(rule, reason, now, plan);
  }

  let updated: ISavingsPlan;
  try {
    updated = await moveNgnIntoPlan({
      userId: rule.userId,
      walletId: plan.walletId,
      planId: plan._id,
      amount,
      via: "autosave",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return recordFailure(
      rule,
      /insufficient/i.test(message)
        ? "Not enough Naira in your wallet"
        : message,
      now,
      plan,
    );
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
    body: `${formatAutoSaveAmount(amount, plan.currency)} moved from your Naira wallet to ${plan.name}.`,
  });

  if (roomToTarget(updated) === 0) await endAtTarget(rule, updated);
  return "saved";
}

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
