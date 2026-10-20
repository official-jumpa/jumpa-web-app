import { NextRequest, NextResponse } from "next/server";
import { getCachedAuthSession } from "@/lib/functions/permissionFunctions";
import { getUserById } from "@/lib/functions/userFunctions";
import { findWalletForUser } from "@/lib/functions/walletFunctions";
import { resolveNextOnboardingRoute } from "@/app/api/v1/user/onboarding/route";
import { environment } from "@/lib/environment";

/**
 * GET /api/auth/callback
 * OAuth callback handler:
 * - Resolves the exact onboarding or app destination for the authenticated user.
 */
export async function GET(req: NextRequest) {
  const origin =
    environment.BETTER_AUTH_URL ||
    environment.AUTH_URL ||
    req.nextUrl.origin;

  try {
    const session = await getCachedAuthSession();

    if (!session) {
      return NextResponse.redirect(`${origin}/onboarding`);
    }

    const [user, wallet] = await Promise.all([
      getUserById(session.user.id),
      findWalletForUser(session.user.id),
    ]);

    const destination = resolveNextOnboardingRoute(user, wallet);
    return NextResponse.redirect(`${origin}${destination}`);
  } catch (err) {
    console.error("[Auth Callback] Error handling callback:", err);
    return NextResponse.redirect(`${origin}/onboarding`);
  }
}

