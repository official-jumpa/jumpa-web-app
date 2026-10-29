import { type NextRequest, NextResponse } from "next/server";
import { processDailySavingsInterest } from "@/lib/services/savings-interest";

/**
  * Daily cron endpoint to process midnight savings interest.
  */
async function handleInterestCron(req: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
      console.error("CRON_SECRET is missing");
      return NextResponse.json(
        { success: false, error: "Cron authentication failed" },
        { status: 503 },
      );
    }
    if (cronSecret) {
      const authHeader = req.headers.get("authorization");
      const isBearerValid = authHeader === `Bearer ${cronSecret}`;

      if (!isBearerValid) {
        return NextResponse.json(
          { success: false, error: "Unauthorized" },
          { status: 401 },
        );
      }
    }

    const result = await processDailySavingsInterest();
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...result,
    });
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error ? err.message : "Failed to process savings interest";
    console.error("[SAVINGS CRON] Error:", err);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return handleInterestCron(req);
}

export async function POST(req: NextRequest) {
  return handleInterestCron(req);
}
