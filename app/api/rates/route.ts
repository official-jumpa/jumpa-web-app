import { NextResponse } from "next/server";
import { getLiveRates } from "@/lib/rates";
import { requireActiveUser } from "@/lib/functions/permissionFunctions";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireActiveUser({
    rateLimit: { tier: "low", action: "get_rates" },
  });
  if (!auth.ok) return auth.response;

  try {
    const rates = await getLiveRates();
    return NextResponse.json(rates, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
      },
    });
  } catch (err) {
    console.error("[Rates API] Error:", err);
    return NextResponse.json(
      { error: "Failed to fetch exchange rates" },
      { status: 500 },
    );
  }
}
