import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Wallet } from "@/models/Wallet";
import { environment } from "@/lib/environment";

/**
 * GET /api/auth/callback
 * OAuth callback handler:
 * - Returning user with existing wallet -> /home
 * - New user without wallet -> /sign-up/pin (Set Transaction PIN)
 */
export async function GET(req: NextRequest) {
  const origin = req.nextUrl.origin;

  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.redirect(`${origin}/onboarding`);
    }

    await connectDB();
    const existingWallet = await Wallet.findOne({ userId: session.user.id });

    if (existingWallet) {
      const res = NextResponse.redirect(`${origin}/home`);
      res.cookies.set("selected_wallet_address", existingWallet.address, {
        path: "/",
        httpOnly: true,
        secure: environment.IS_PRODUCTION,
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60, // 7 days
      });
      return res;
    }

    // New user: Redirect to set their 6-digit transaction PIN
    return NextResponse.redirect(`${origin}/sign-up/pin`);
  } catch (err) {
    console.error("[Auth Callback] Error handling callback:", err);
    return NextResponse.redirect(`${origin}/onboarding`);
  }
}
