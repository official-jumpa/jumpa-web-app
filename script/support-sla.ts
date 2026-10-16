import "./load-env";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { runSupportSweep } from "@/lib/functions/supportEventFunctions";

/**
 * Standalone runner for the support timers. Schedule it every 5 minutes.
 * Usage: node --import tsx script/support-sla.ts
 */
async function main() {
  try {
    await connectDB();
    const { unclaimed, breached, closed } = await runSupportSweep();
    console.log(
      `[Support SLA] unclaimed alerts: ${unclaimed}, SLA breaches: ${breached}, closed: ${closed}`,
    );
  } catch (err) {
    console.error(
      "[Support SLA] Sweep failed:",
      (err as Error)?.message || err,
    );
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect().catch(() => {});
  }
}

main();
