import { NextResponse } from "next/server";
import { getLiveRates } from "@/lib/rates";
import { requireActiveUser } from "@/lib/functions/permissionFunctions";
import { formatOneLineError, isTimeoutError } from "@/lib/utils/api-best-practices";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/rates
 * Returns real-time crypto prices (USD) and fiat exchange rates (NGN, GHS, KES, ZAR).
 * Multi-source resilient pipeline with 1-hour in-memory server cache and HTTP caching headers.
 */
export async function GET() {
  const auth = await requireActiveUser({
    rateLimit: { tier: "low", action: "get_rates" },
  });
  if (!auth.ok) return auth.response;

  try {
    // Enforce 8s timeout ceiling for rate retrieval
    const ratesPromise = getLiveRates();
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Rates service timeout")), 8000),
    );

    const rates = await Promise.race([ratesPromise, timeoutPromise]);

    return NextResponse.json(rates, {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200",
      },
    });
  } catch (err: any) {
    const isTimeout = isTimeoutError(err);
    console.error(`[Rates API] ${isTimeout ? "Timeout" : "Error"}: ${formatOneLineError(err)}`);

    return NextResponse.json(
      {
        success: false,
        error: isTimeout
          ? "Exchange rate service timed out. Please try again."
          : "Unable to retrieve live exchange rates at this time.",
      },
      { status: isTimeout ? 504 : 502 },
    );
  }
}
