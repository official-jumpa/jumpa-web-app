import { nextAutoSaveRun } from "@/lib/auto-save-schedule";
import { connectDB } from "@/lib/db";
import { verifyWalletPin } from "@/lib/execution/verify-pin";
import { findWalletForUser } from "@/lib/functions/walletFunctions";
import {
  AUTO_SAVE_CURRENCIES,
  AUTO_SAVE_KINDS,
  type AutoSaveRule as AutoSaveRuleView,
  formatAutoSaveAmount,
  sourceCopy,
} from "@/lib/savings-auto-save";
import type { SaveAutoSaveInput } from "@/lib/validations/auto-save.validation";
import { AutoSaveRule, type IAutoSaveRule } from "@/models/AutoSaveRule";
import { type ISavingsPlan, SavingsPlan } from "@/models/SavingsPlan";

/** Setting up and managing auto-save rules. The scheduled runs live in `auto-save-runner.ts`. */

type Failure = { ok: false; error: string; status: number };
type Success<T> = { ok: true } & T;

const fail = (error: string, status = 400): Failure => ({
  ok: false,
  error,
  status,
});

/** The rule as the screens read it. */
export function toAutoSaveRuleView(rule: IAutoSaveRule): AutoSaveRuleView {
  return {
    goalId: rule.planId,
    paused: rule.paused,
    cadence: rule.cadence,
    amount: rule.amount,
    currency: rule.currency,
    source: rule.source,
    weekday: rule.weekday,
    monthDay: rule.monthDay,
    intervalMinutes: rule.intervalMinutes,
    time: rule.time,
    nextRunAt: new Date(rule.nextRunAt).toISOString(),
    lastRunAt: rule.lastRunAt ? new Date(rule.lastRunAt).toISOString() : null,
  };
}

/** Why a plan cannot be auto-saved into, or nothing when it can. Checked at setup and on every run. */
export function autoSaveBlocker(
  plan: ISavingsPlan | null,
  userId: string,
): string | undefined {
  if (!plan || plan.userId !== userId) return "Savings plan not found";
  if (plan.status !== "Active") return "This plan is no longer active";
  if (!AUTO_SAVE_KINDS.includes(plan.kind)) {
    return "Auto-save is only available on flexible plans";
  }
  if (!AUTO_SAVE_CURRENCIES[plan.currency].live) {
    return `Auto-save is not available for ${plan.currency} plans yet`;
  }
  return undefined;
}

/** What a plan can still take before its target; unlimited when it has none. */
export function roomToTarget(plan: ISavingsPlan): number {
  if (!plan.targetAmount || plan.targetAmount <= 0) return Infinity;
  return Math.max(0, plan.targetAmount - (plan.currentAmount || 0));
}

export async function listAutoSaveRules(
  userId: string,
): Promise<AutoSaveRuleView[]> {
  await connectDB();
  const rules = await AutoSaveRule.find({ userId }).lean<IAutoSaveRule[]>();
  return rules.map(toAutoSaveRuleView);
}

/** Starts a plan's rule or replaces it. The PIN is the saver's consent; saving always leaves it running. */
export async function saveAutoSaveRule(
  userId: string,
  input: SaveAutoSaveInput,
): Promise<Success<{ rule: AutoSaveRuleView }> | Failure> {
  await connectDB();
  const [wallet, plan] = await Promise.all([
    findWalletForUser(userId),
    SavingsPlan.findById(input.planId).lean<ISavingsPlan>(),
  ]);
  if (!wallet) return fail("Wallet not found", 404);

  if (!plan || plan.userId !== userId) {
    return fail("Savings plan not found", 404);
  }
  const blocker = autoSaveBlocker(plan, userId);
  if (blocker) return fail(blocker);

  const pinCheck = await verifyWalletPin(wallet, input.pin, { userId });
  if (!pinCheck.ok) return fail(pinCheck.error, pinCheck.status);

  if (sourceCopy(input.source).currency !== plan.currency) {
    return fail("Pay with a wallet in the plan's currency");
  }
  const room = Math.min(
    roomToTarget(plan),
    AUTO_SAVE_CURRENCIES[plan.currency].cap,
  );
  if (input.amount > room) {
    return fail(
      room > 0
        ? `That is more than the ${formatAutoSaveAmount(room, plan.currency)} left on this plan`
        : "This plan has already reached its target",
    );
  }

  const { pin: _pin, planId, ...schedule } = input;
  const rule = await AutoSaveRule.findOneAndUpdate(
    { planId, userId },
    {
      $set: {
        ...schedule,
        userId,
        currency: plan.currency,
        paused: false,
        nextRunAt: nextAutoSaveRun(schedule, new Date()),
        failedRuns: 0,
        lastError: null,
      },
    },
    {
      upsert: true,
      returnDocument: "after",
      setDefaultsOnInsert: true,
      runValidators: true,
    },
  ).lean<IAutoSaveRule>();
  if (!rule) return fail("Could not save auto-save", 500);

  return { ok: true, rule: toAutoSaveRuleView(rule) };
}

/** Pausing stops runs; resuming picks up at the next slot from now, never the ones missed. */
export async function setAutoSavePaused(
  userId: string,
  planId: string,
  paused: boolean,
): Promise<Success<{ rule: AutoSaveRuleView }> | Failure> {
  await connectDB();
  const current = await AutoSaveRule.findOne({
    planId,
    userId,
  }).lean<IAutoSaveRule>();
  if (!current) return fail("Auto-save not found", 404);

  const changes = paused
    ? { paused: true }
    : {
        paused: false,
        nextRunAt: nextAutoSaveRun(current, new Date()),
        failedRuns: 0,
        lastError: null,
      };
  await AutoSaveRule.updateOne({ _id: current._id }, { $set: changes });

  return { ok: true, rule: toAutoSaveRuleView({ ...current, ...changes }) };
}

/** Turning off deletes the rule. Money already saved stays in the plan. */
export async function removeAutoSaveRule(
  userId: string,
  planId: string,
): Promise<Success<object>> {
  await connectDB();
  await AutoSaveRule.deleteOne({ planId, userId });
  return { ok: true };
}
