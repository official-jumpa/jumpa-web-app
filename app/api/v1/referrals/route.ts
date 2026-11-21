import { NextResponse } from "next/server";
import { requireActiveUser } from "@/lib/functions/permissionFunctions";
import { getReferralOverview } from "@/lib/referrals/overview";
import { formatOneLineError } from "@/lib/utils/api-best-practices";

/**
 * GET /api/v1/referrals
 * The signed-in user's code, link, earnings and invite history.
 */
export async function GET() {
  try {
    const auth = await requireActiveUser({
      rateLimit: { tier: "low", action: "referrals_get" },
    });
    if (!auth.ok) return auth.response;

    const overview = await getReferralOverview(auth.userId);
    return NextResponse.json({ success: true, data: overview });
  } catch (err) {
    console.error(`[ReferralsAPI] Error: ${formatOneLineError(err)}`);
    return NextResponse.json(
      {
        success: false,
        error: "Unable to fetch referral statistics. Please try again later.",
      },
      { status: 500 },
    );
  }
}
