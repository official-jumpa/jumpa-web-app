import { NextRequest, NextResponse } from "next/server";
import { requireActiveUser } from "@/lib/functions/permissionFunctions";
import { getReferralStatsForUser } from "@/lib/functions/referralFunctions";
import { formatOneLineError } from "@/lib/utils/api-best-practices";

/**
 * GET /api/v1/referrals
 * Returns referral statistics and history for the authenticated user.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireActiveUser({
      rateLimit: { tier: "low", action: "referrals_get" },
    });
    if (!auth.ok) return auth.response;

    const stats = await getReferralStatsForUser(auth.userId);

    return NextResponse.json({
      success: true,
      data: stats,
    });
  } catch (err: any) {
    console.error(
      `[ReferralsAPI] Error: ${formatOneLineError(err)}`,
    );
    return NextResponse.json(
      { success: false, error: "Unable to fetch referral statistics. Please try again later." },
      { status: 500 },
    );
  }
}
