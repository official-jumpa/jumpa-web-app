import { NextRequest, NextResponse } from "next/server";
import { resolveAllPendingTransactions } from "@/lib/functions/transactionFunctions";

/**
 * GET or POST /api/cron/resolve-transactions
 *
 * Checks the status of all PENDING Switch onramp/offramp transactions with the Switch API
 * and updates their status in the database.
 *
 * Query Params:
 *  - staleHours: number (default: 24) - hours after which unfulfilled AWAITING_DEPOSIT txs are marked FAILED
 *  - secret: string (optional) - for authenticating via query param
 */
async function handleResolve(req: NextRequest) {
  try {
    // Optional cron secret protection in production
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

    const staleHoursParam = req.nextUrl.searchParams.get("staleHours");
    const staleHours = staleHoursParam ? Number(staleHoursParam) : undefined;

    const result = await resolveAllPendingTransactions({
      staleHours: staleHours && !isNaN(staleHours) ? staleHours : 24,
    });

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...result,
    });
  } catch (error: any) {
    console.error("[Cron Resolve Transactions] Error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Internal server error" },
      { status: 500 },
    );
  }
}

export async function GET(req: NextRequest) {
  return handleResolve(req);
}

export async function POST(req: NextRequest) {
  return handleResolve(req);
}