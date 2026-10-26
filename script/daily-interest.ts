import "dotenv/config";
import { connectDB } from "@/lib/db";
import { processDailySavingsInterest } from "@/lib/services/savings-interest";

/**
 * Daily savings interest calculation and payouts.
 */
async function main() {
  console.log(
    "[Savings Cron] Starting daily savings interest accrual run...\n",
  );

  try {
    await connectDB();
    const result = await processDailySavingsInterest();

    console.log("-----------------------------------------");
    console.log("✅ Daily Savings Interest Run Complete");
    console.log(`- Processed Plans: ${result.processedPlans}`);
    console.log(
      `- Skipped Plans (Already accrued/0 balance): ${result.skippedPlans}`,
    );
    console.log(`- Matured Plans: ${result.maturedPlans}`);
    console.log(
      `- Total Interest Credited (NGN): ₦${result.totalInterestCredited.NGN.toLocaleString()}`,
    );
    console.log(
      `- Total Interest Credited (USDC): $${result.totalInterestCredited.USDC}`,
    );
    if (result.errors.length > 0) {
      console.warn(`- Errors encountered: ${result.errors.length}`);
      for (const err of result.errors) {
        console.error(`   Plan [${err.planId}]: ${err.error}`);
      }
    }
    console.log("-----------------------------------------\n");

    process.exit(0);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("\n❌ Error running daily interest cron:", errorMsg);
    process.exit(1);
  }
}

main();
