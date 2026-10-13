import { connectDB } from "@/lib/db";
import { SavingsPlan, type ISavingsPlan } from "@/models/SavingsPlan";
import { createSavingsTransaction } from "@/lib/functions/savingsFunctions";

//TODO: REVISIT THE CALCULATIONS HERE

export interface DailyInterestRunResult {
  processedPlans: number;
  skippedPlans: number;
  totalInterestCredited: {
    NGN: number;
    USDC: number;
  };
  errors: Array<{ planId: string; error: string }>;
}

/**
 * Returns the current date in YYYY-MM-DD (UTC).
 */
export function getUtcDateString(date: Date = new Date()): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Calculates simple daily interest based on the plan's initial deposit and configured fixed APY.
 * DailyYield = initialDeposit * (APY / 100) / 365
 */
export function calculateDailyInterest(
  initialDeposit: number,
  lockedApy: number,
): number {
  if (initialDeposit <= 0 || !lockedApy || lockedApy <= 0) return 0;
  const daily = (initialDeposit * (lockedApy / 100)) / 365;
  // Round to 4 decimal places for precision
  return Math.max(0, Number(daily.toFixed(4)));
}

/**
 * Processes daily midnight interest accrual across all active plans.
 * Idempotent: checks each plan's `lastAccruedDate` against today's date.
 */
export async function processDailySavingsInterest(
  referenceDate: Date = new Date(),
): Promise<DailyInterestRunResult> {
  await connectDB();
  const todayStr = getUtcDateString(referenceDate);

  const result: DailyInterestRunResult = {
    processedPlans: 0,
    skippedPlans: 0,
    totalInterestCredited: { NGN: 0, USDC: 0 },
    errors: [],
  };

  // Find all active savings plans with a positive initial deposit
  const activePlans = await SavingsPlan.find({
    status: "Active",
    initialDeposit: { $gt: 0 },
  });

  for (const plan of activePlans) {
    try {
      // 1. Skip if already processed for today
      if (plan.lastAccruedDate === todayStr) {
        result.skippedPlans += 1;
        continue;
      }

      // 2. Check if plan is locked and past its maturity date -> mark matured and stop accruing
      if (plan.kind === "lock" && plan.endDate && referenceDate >= new Date(plan.endDate)) {
        await SavingsPlan.updateOne(
          { _id: plan._id },
          { $set: { status: "Matured" } },
        );
        result.skippedPlans += 1;
        continue;
      }

      // 3. Calculate 1 day of simple interest based on initialDeposit and locked APY
      const dailyYield = calculateDailyInterest(
        plan.initialDeposit,
        plan.apy,
      );

      if (dailyYield <= 0) {
        result.skippedPlans += 1;
        continue;
      }

      // 4. Record savings transaction
      await createSavingsTransaction({
        planId: plan._id,
        userId: plan.userId,
        currency: plan.currency,
        kind: "interest",
        amount: Number(dailyYield.toFixed(2)),
        at: referenceDate,
      });

      // 5. Update plan interestEarned and lastAccruedDate atomically
      await SavingsPlan.updateOne(
        { _id: plan._id },
        {
          $inc: { interestEarned: Number(dailyYield.toFixed(2)) },
          $set: { lastAccruedDate: todayStr },
        },
      );

      result.processedPlans += 1;
      const cur = plan.currency === "NGN" ? "NGN" : "USDC";
      result.totalInterestCredited[cur] += Number(dailyYield.toFixed(2));
    } catch (err: any) {
      console.error(`[SavingsInterest] Failed processing plan ${plan._id}:`, err);
      result.errors.push({ planId: plan._id, error: err.message || String(err) });
    }
  }

  return result;
}
