import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { Wallet } from "@/models/Wallet";
import { syncWalletInboundDeposits } from "@/lib/functions/depositSyncFunctions";

/**
 * Standalone runner for check-deposits.
 * Usage:
 *   node --import tsx script/check-deposits.ts [--window-minutes 10] [--all]
 */
async function main() {
  const args = process.argv.slice(2);
  let windowMinutes = 10;
  const windowIndex = args.indexOf("--window-minutes");
  if (windowIndex !== -1 && args[windowIndex + 1]) {
    windowMinutes = Number(args[windowIndex + 1]) || 10;
  }
  const checkAll = args.includes("--all");

  console.log(
    `[Deposit Cron] Running deposit check (${checkAll ? "ALL wallets" : `active in last ${windowMinutes}m`})...\n`,
  );

  try {
    await connectDB();

    const query: Record<string, any> = {};
    if (!checkAll) {
      const threshold = new Date(Date.now() - windowMinutes * 60 * 1000);
      query.$or = [
        { lastUsedAt: { $gte: threshold } },
        { updatedAt: { $gte: threshold } },
      ];
    }

    const wallets = await Wallet.find(query).lean();
    console.log(`Found ${wallets.length} wallet(s) to scan.`);

    let totalDeposits = 0;

    for (const wallet of wallets) {
      const deposits = await syncWalletInboundDeposits(wallet as any);
      if (deposits.length > 0) {
        totalDeposits += deposits.length;
        console.log(
          ` -> Wallet [${wallet.name || wallet._id}] detected ${deposits.length} new deposit(s):`,
        );
        for (const d of deposits) {
          console.log(`    ${d.chain.toUpperCase()}: ${d.amount} ${d.token} (tx: ${d.txHash.slice(0, 16)}...)`);
        }
      }
    }

    console.log(
      `\n✅ Done! Checked ${wallets.length} wallet(s), recorded ${totalDeposits} new deposit(s).`,
    );
    process.exit(0);
  } catch (err: any) {
    console.error("\n❌ Error running deposit check:", err?.message || err);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect().catch(() => {});
  }
}

main();
