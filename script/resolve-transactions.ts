import "dotenv/config";
import mongoose from "mongoose";
import { resolveAllPendingTransactions } from "@/lib/functions/transactionFunctions";

async function main() {
  const args = process.argv.slice(2);
  let staleHours = 1;
  const staleIndex = args.indexOf("--stale-hours");
  if (staleIndex !== -1 && args[staleIndex + 1]) {
    staleHours = Number(args[staleIndex + 1]) || 1;
  }

  console.log(`Checking tx with stale threshold: ${staleHours} hours\n`);

  try {
    const result = await resolveAllPendingTransactions({ staleHours });

    console.log(`Checked: ${result.totalChecked} pending tx(s), confirmed: ${result.confirmed}, failed/expired: ${result.failed}, still pending: ${result.stillPending}`);

    if (result.details.length > 0) {
      console.log("Transaction Details:", JSON.stringify(result.details, null, 2));
    } else {
      console.log("No pending txs found");
    }

    console.log("\n✅ Job Done");
    process.exit(0); //terminate the session
  } catch (err: any) {
    console.error("\n❌ Error resolving transactions:", err?.message || err);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect().catch(() => { });
  }
}

main();
