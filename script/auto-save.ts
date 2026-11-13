import "./load-env";
import mongoose from "mongoose";
import { runDueAutoSaves } from "@/lib/services/auto-save-runner";
import { formatOneLineError } from "@/lib/utils/api-best-practices";

/**
 * Runs every auto-save rule that is due, once.
 * Usage:
 *   npm run auto-save              # one pass, for the host's cron (every minute)
 *   npm run auto-save -- --watch   # a pass every minute until Ctrl+C, for local testing
 */
const WATCH_INTERVAL_MS = 60_000;

async function runOnce() {
  const started = Date.now();
  const summary = await runDueAutoSaves();
  console.log(
    `[AutoSave] saved ${summary.saved}, failed ${summary.failed}, ended ${summary.ended}, skipped ${summary.skipped} (${Date.now() - started}ms)`,
  );
}

async function main() {
  if (!process.argv.includes("--watch")) {
    await runOnce();
    return;
  }
  console.log("[AutoSave] Watching: a pass every minute. Ctrl+C to stop.");
  for (;;) {
    await runOnce().catch((err) =>
      console.error(`[AutoSave] Pass failed: ${formatOneLineError(err)}`),
    );
    await new Promise((resolve) => setTimeout(resolve, WATCH_INTERVAL_MS));
  }
}

main()
  .then(() => mongoose.disconnect())
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(`[AutoSave] Run failed: ${formatOneLineError(err)}`);
    process.exit(1);
  });
