import { NextRequest, NextResponse } from "next/server";
import { requireActiveUser } from "@/lib/functions/permissionFunctions";
import { getReferralStatsForUser } from "@/lib/functions/referralFunctions";

/**
 * GET /api/referrals
 * Returns referral statistics and history for the authenticated user.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireActiveUser({
      rateLimit: { tier: "low", action: "referrals_get" },
    });
    if (!auth.ok) return auth.response;

    const stats = await getReferralStatsForUser(auth.userId);
    return NextResponse.json(stats);
  } catch (err: any) {
    console.error("[ReferralsAPI] Error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
