import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Wallet } from "@/models/Wallet";

/**
 * GET /api/auth/callback
 * OAuth callback handler that checks wallet existence and redirects to /home or /sign-up/secure-wallet.
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
    const wallet = await Wallet.findOne({ userId: session.user.id });

    if (wallet) {
      return NextResponse.redirect(`${origin}/home`);
    } else {
      return NextResponse.redirect(`${origin}/sign-up/secure-wallet`);
    }
  } catch (err) {
    console.error("[Auth Callback] Error handling callback:", err);
    return NextResponse.redirect(`${origin}/onboarding`);
  }
}
