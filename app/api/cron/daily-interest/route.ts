import { NextRequest, NextResponse } from "next/server";
import { processDailySavingsInterest } from "@/lib/services/savings-interest";

/**
 * Daily cron endpoint to process midnight savings interest.
 * Can be triggered by internal cron, Vercel cron, or admin tools.
 */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    //TODO: ADD THIS LATER IN ENVIRONMENT THEN TRIGGER EVERY MIDNIGHT

    // Verify secret if configured
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized cron trigger" }, { status: 401 });
    }

    const result = await processDailySavingsInterest();
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...result,
    });
  } catch (err: any) {
    console.error("[SAVINGS CRON] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to process savings interest" },
      { status: 500 },
    );
  }
}
