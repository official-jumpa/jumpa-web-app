import { type NextRequest, NextResponse } from "next/server";
import { runSupportSweep } from "@/lib/functions/supportEventFunctions";

/** GET or POST /api/cron/support-sla. The same sweep as `npm run support-sla`. */
async function handleSweep(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error("CRON_SECRET is missing");
    return NextResponse.json(
      { success: false, error: "Cron authentication failed" },
      { status: 503 },
    );
  }
  if (cronSecret) {
    const bearer = req.headers.get("authorization") === `Bearer ${cronSecret}`;
    if (!bearer) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }
  }

  try {
    const now = new Date();
    const result = await runSupportSweep(now);
    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      ...result,
    });
  } catch (err) {
    console.error("[Cron Support SLA]", err);
    return NextResponse.json(
      { success: false, error: "Support sweep failed" },
      { status: 500 },
    );
  }
}

export const GET = handleSweep;
export const POST = handleSweep;
