import { type NextRequest, NextResponse } from "next/server";
import { processDailySavingsInterest } from "@/lib/services/savings-interest";

/**
  * Daily cron endpoint to process midnight savings interest.
  */
async function handleInterestCron(req: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && process.env.NODE_ENV === "production") {
      const authHeader = req.headers.get("authorization");
      const urlSecret = req.nextUrl.searchParams.get("secret");
      const isBearerValid = authHeader === `Bearer ${cronSecret}`;
      const isQueryValid = urlSecret === cronSecret;

      if (!isBearerValid && !isQueryValid) {
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
