import "dotenv/config";
import mongoose from "mongoose";
import { resolveAllPendingTransactions } from "@/lib/functions/transactionFunctions";

async function main() {
  console.log("════════════════════════════════════════════════════════════");
  console.log("  🔄 Resolving Pending Transactions...");
  console.log("════════════════════════════════════════════════════════════\n");

  const args = process.argv.slice(2);
  let staleHours = 24;
  const staleIndex = args.indexOf("--stale-hours");
  if (staleIndex !== -1 && args[staleIndex + 1]) {
    staleHours = Number(args[staleIndex + 1]) || 24;
  }

  console.log(`Checking transactions with stale threshold: ${staleHours} hours\n`);

  try {
    const result = await resolveAllPendingTransactions({ staleHours });

    console.log("------------------------------------------------------------");
    console.log(`Checked:       ${result.totalChecked} pending transaction(s)`);
    console.log(`Confirmed:     ${result.confirmed}`);
    console.log(`Failed/Expired:${result.failed}`);
    console.log(`Still Pending: ${result.stillPending}`);
    console.log("------------------------------------------------------------\n");

    if (result.details.length > 0) {
      console.log("Transaction Details:");
      console.table(
        result.details.map((d) => ({
          ID: d.id,
          Type: d.type,
          Amount: `${d.amount} ${d.token}`,
          "Prev Status": d.previousStatus,
          "New Status": d.newStatus,
          "Switch Status": d.providerStatus,
          Reason: d.reason || "Settled",
        })),
      );
    } else {
      console.log("No pending transactions found with Switch references.");
    }

    console.log("\n✅ Done!");
  } catch (err: any) {
    console.error("\n❌ Error resolving transactions:", err?.message || err);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect().catch(() => {});
  }
}

main();
