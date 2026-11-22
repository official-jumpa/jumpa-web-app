import { NextResponse } from "next/server";
import { requireActiveUser } from "@/lib/functions/permissionFunctions";
import {
  claimReferralEarnings,
  ReferralClaimError,
} from "@/lib/referrals/earnings";
import { formatOneLineError } from "@/lib/utils/api-best-practices";

/**
 * POST /api/v1/referrals/claim
 * Moves every unclaimed referral reward into the user's Naira wallet.
 */
export async function POST() {
  try {
    const auth = await requireActiveUser({
      rateLimit: { tier: "high", action: "referrals_claim" },
    });
    if (!auth.ok) return auth.response;

    const claim = await claimReferralEarnings(auth.userId);
    return NextResponse.json({ success: true, data: claim });
  } catch (err) {
    if (err instanceof ReferralClaimError) {
      return NextResponse.json(
        { success: false, error: err.message, code: err.code },
        { status: err.status },
      );
    }
    console.error(`[ReferralsClaimAPI] Error: ${formatOneLineError(err)}`);
    return NextResponse.json(
      {
        success: false,
        error: "Unable to claim your earnings. Please try again later.",
      },
      { status: 500 },
    );
  }
}
