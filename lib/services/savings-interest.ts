import { connectDB } from "@/lib/db";
import { SavingsPlan, type ISavingsPlan } from "@/models/SavingsPlan";
import { SavingsTransaction } from "@/models/SavingsTransaction";
import { createSavingsTransaction } from "@/lib/functions/savingsFunctions";

export interface DailyInterestRunResult {
  processedPlans: number;
  skippedPlans: number;
  maturedPlans: number;
  totalInterestCredited: {
    NGN: number;
    USDC: number;
  };
  errors: Array<{ planId: string; error: string }>;
}

/**
 * Returns the date in YYYY-MM-DD (UTC).
 */
export function getUtcDateString(date: Date = new Date()): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Calculates number of full calendar days between two UTC date strings (YYYY-MM-DD).
 */
export function getDayDiff(startDateStr: string, endDateStr: string): number {
  const [sy, sm, sd] = startDateStr.split("-").map(Number);
  const [ey, em, ed] = endDateStr.split("-").map(Number);
  const start = Date.UTC(sy, sm - 1, sd);
  const end = Date.UTC(ey, em - 1, ed);
  return Math.max(0, Math.floor((end - start) / (1000 * 60 * 60 * 24)));
}

/**
 * Calculates simple interest for an exact number of calendar days.
 * Interest = balance * (APY / 100) * (days / 365)
 * Precision: 6 decimal places for USDC, 2 decimal places for NGN.
 */
export function calculateInterestForPeriod(
  balance: number,
  lockedApy: number,
  days: number,
  currency: "NGN" | "USDC" = "NGN",
): number {
  if (balance <= 0 || !lockedApy || lockedApy <= 0 || days <= 0) return 0;
  const yieldAmount = (balance * (lockedApy / 100) * days) / 365;
  const precision = currency === "NGN" ? 2 : 6;
  return Number(yieldAmount.toFixed(precision));
}

/**
 * Calculates simple daily interest based on active balance and locked APY.
 */
export function calculateDailyInterest(
  balance: number,
  lockedApy: number,
  currency: "NGN" | "USDC" = "NGN",
): number {
  return calculateInterestForPeriod(balance, lockedApy, 1, currency);
}

/**
 * Processes daily midnight interest accrual across all active plans.
 *
 * Features:
 * - Anti-Sniping Protection: Inspects deposit history in the last 24h and excludes
 *   un-matured deposits from today's yield.
 * - Multi-day catch-up: Accrues missing calendar days if cron is delayed.
 * - Segregated Ledger: Stores interest strictly in `interestEarned` (leaving `currentAmount` principal uncompounded).
 * - Atomic Compare-And-Swap (CAS): Guards against concurrent duplicate cron executions.
 * - Maturity Handling: Matures locked plans when the end date is reached.
 * - Currency-aware precision: 6 decimals for USDC, 2 decimals for NGN.
 */
export async function processDailySavingsInterest(
  referenceDate: Date = new Date(),
): Promise<DailyInterestRunResult> {
  await connectDB();
  const todayStr = getUtcDateString(referenceDate);

  const result: DailyInterestRunResult = {
    processedPlans: 0,
    skippedPlans: 0,
    maturedPlans: 0,
    totalInterestCredited: { NGN: 0, USDC: 0 },
    errors: [],
  };

  // Find all active savings plans with a positive current balance
  const activePlans = await SavingsPlan.find({
    status: "Active",
    currentAmount: { $gt: 0 },
  });

  // 24-hour maturation cutoff: deposits made after this timestamp cannot earn today's yield
  const twentyFourHoursAgo = new Date(
    referenceDate.getTime() - 24 * 60 * 60 * 1000,
  );

  for (const plan of activePlans) {
    try {
      // 1. Skip if already processed for today
      if (plan.lastAccruedDate === todayStr) {
        result.skippedPlans += 1;
        continue;
      }

      // 2. Determine baseline accrual start date
      const baselineStartStr =
        plan.lastAccruedDate ||
        getUtcDateString(
          new Date(plan.startDate || plan.createdAt || referenceDate),
        );

      // 3. Check for lock plan maturity boundary
      let effectiveEndStr = todayStr;
      let isPlanMatured = false;

      if (plan.kind === "lock" && plan.endDate) {
        const lockEndDateStr = getUtcDateString(new Date(plan.endDate));
        if (referenceDate >= new Date(plan.endDate)) {
          isPlanMatured = true;
          // Only accrue interest up to the lock maturity date
          if (lockEndDateStr < effectiveEndStr) {
            effectiveEndStr = lockEndDateStr;
          }
        }
      }

      // 4. Calculate elapsed days to accrue
      const daysElapsed = getDayDiff(baselineStartStr, effectiveEndStr);

      if (daysElapsed <= 0) {
        // No new calendar days elapsed (e.g. plan created today or already at end date)
        if (isPlanMatured && plan.status === "Active") {
          await SavingsPlan.updateOne(
            { _id: plan._id, status: "Active" },
            { $set: { status: "Matured", lastAccruedDate: todayStr } },
          );
          result.maturedPlans += 1;
        }
        result.skippedPlans += 1;
        continue;
      }

      // 5. Anti-Sniping Protection: Check deposit history in the last 24h
      // Any deposit or top-up made within the last 24h has NOT matured for today's payout.
      const recentDeposits = await SavingsTransaction.find({
        planId: plan._id,
        kind: { $in: ["deposit", "top_up"] },
        at: { $gte: twentyFourHoursAgo },
      })
        .select("amount")
        .lean();

      const unMaturedDepositAmount = recentDeposits.reduce(
        (sum, d) => sum + (d.amount || 0),
        0,
      );

      // Eligible principal balance is active balance minus un-matured recent top-ups
      const eligibleBalance = Math.min(
        plan.currentAmount,
        Math.max(0, plan.currentAmount - unMaturedDepositAmount),
      );

      if (eligibleBalance <= 0) {
        result.skippedPlans += 1;
        continue;
      }

      // 6. Calculate accrued interest for elapsed days based on eligible matured balance
      const interestToAdd = calculateInterestForPeriod(
        eligibleBalance,
        plan.apy,
        daysElapsed,
        plan.currency as "NGN" | "USDC",
      );

      if (interestToAdd <= 0) {
        result.skippedPlans += 1;
        continue;
      }

      // 7. Atomic Compare-And-Swap update: guards against concurrent cron workers
      // Notice: interestToAdd is incremented into interestEarned (leaving currentAmount principal clean)
      const session = await SavingsPlan.startSession();
      let updatedPlan: any;
      let raced = false;
      try {
        await session.withTransaction(async () => {
      updatedPlan = await SavingsPlan.findOneAndUpdate(
        { _id: plan._id, status: "Active", lastAccruedDate: { $ne: todayStr } },
        {
          $inc: { interestEarned: interestToAdd },
          $set: {
            lastAccruedDate: todayStr,
            ...(isPlanMatured ? { status: "Matured" } : {}),
          },
        },
        { returnDocument: "after", session },
      );

      if (!updatedPlan) {
        // Race condition: another worker already accrued this plan for today
        raced = true;
        return;
      }

      // 8. Record an immutable savings transaction ledger entry
      await createSavingsTransaction({
        planId: plan._id,
        userId: plan.userId,
        currency: plan.currency,
        kind: "interest",
        amount: interestToAdd,
        at: referenceDate,
      }, session);
        });
      } finally {
        await session.endSession();
      }
      if (raced) {
        result.skippedPlans += 1;
        continue;
      }

      result.processedPlans += 1;
      if (isPlanMatured) result.maturedPlans += 1;

      const cur = plan.currency === "NGN" ? "NGN" : "USDC";
      result.totalInterestCredited[cur] = Number(
        (result.totalInterestCredited[cur] + interestToAdd).toFixed(
          cur === "NGN" ? 2 : 6,
        ),
      );
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error(
        `[SavingsInterest] Failed processing plan ${plan._id}:`,
        err,
      );
      result.errors.push({
        planId: plan._id,
        error: errorMsg,
      });
    }
  }

  return result;
}
