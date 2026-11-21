import "./load-env";
import mongoose from "mongoose";
import { sweepReferrals } from "@/lib/referrals/progress";
import { formatOneLineError } from "@/lib/utils/api-best-practices";

/**
 * Pays every referral that has met the rules but was missed by the live hooks.
 * Usage: `npm run referral-rewards` — one pass, for the Vercy cron (every 10 minutes).
 */
async function main() {
  const started = Date.now();
  const summary = await sweepReferrals();
  console.log(
    `[ReferralRewards] checked ${summary.checked}, rewarded ${summary.rewarded}, awaiting KYC ${summary.awaitingKyc}, awaiting trade ${summary.awaitingTransaction}, failed ${summary.failed} (${Date.now() - started}ms)`,
  );
}

main()
  .then(() => mongoose.disconnect())
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(`[ReferralRewards] Run failed: ${formatOneLineError(err)}`);
    process.exit(1);
  });
