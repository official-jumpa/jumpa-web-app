import "./load-env";
import mongoose from "mongoose";
import { moveFossapayBalances } from "@/lib/functions/fossapayMoveFunctions";
import { formatOneLineError } from "@/lib/utils/api-best-practices";

/**
 * Moves Naira stuck on retired FossaPay accounts onto each user's Aella account.
 * Usage: `npm run move-fossapay-balances` lists what it would do and changes nothing.
 * `npm run move-fossapay-balances -- --apply` moves it; add `--user <userId>` to limit the run to one person.
 */
async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const userFlag = args.indexOf("--user");
  const userId = userFlag >= 0 ? args[userFlag + 1] : undefined;
  if (userFlag >= 0 && !userId) throw new Error("--user needs a user id");

  const rows = await moveFossapayBalances({ apply, userId });
  const db = mongoose.connection;
  console.log(
    `[FossapayMove] ${apply ? "APPLY" : "DRY RUN, nothing changed"} on ${db.host}/${db.name}${userId ? ` for ${userId}` : ""}`,
  );

  for (const r of rows) {
    const live = r.liveBalance === null ? "unread" : `₦${r.liveBalance}`;
    console.log(
      `${r.outcome.padEnd(19)} ₦${String(r.amount).padEnd(9)} FossaPay holds ${live.padEnd(10)} ${r.userId} ${r.accountName}${r.error ? ` (${r.error})` : ""}`,
    );
  }

  const total = (outcome: string) =>
    rows
      .filter((r) => r.outcome === outcome)
      .reduce((sum, r) => sum + r.amount, 0);
  const count = (outcome: string) =>
    rows.filter((r) => r.outcome === outcome).length;
  console.log(
    `[FossapayMove] moved ${count("moved")} (₦${total("moved")}), would move ${count("would_move")} (₦${total("would_move")}), no Aella account ${count("no_aella_account")} (₦${total("no_aella_account")}), FossaPay holds less ${count("fossapay_holds_less")}, failed ${count("failed")}`,
  );
  if (count("failed") > 0) process.exitCode = 1;
}

main()
  .then(() => mongoose.disconnect())
  .then(() => process.exit(process.exitCode ?? 0))
  .catch((err) => {
    console.error(`[FossapayMove] Run failed: ${formatOneLineError(err)}`);
    process.exit(1);
  });
