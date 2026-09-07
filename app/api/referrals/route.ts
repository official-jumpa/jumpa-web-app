import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getReferralStatsForUser } from "@/lib/functions/referralFunctions";

/**
 * GET /api/referrals
 * Returns referral statistics and history for the authenticated user.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const stats = await getReferralStatsForUser(session.user.id);
    return NextResponse.json(stats);
  } catch (err: any) {
    console.error("[ReferralsAPI] Error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
