import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Wallet } from "@/models/Wallet";
import { User } from "@/models/User";
import { environment } from "@/lib/environment";

import { ensureUserJumpaFields } from "@/lib/user-profile";

/**
 * GET /api/auth/status
 * Light status check returning authentication status, user profile info, and active wallet details.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json({
        authenticated: false,
        hasWallet: false,
        selectedAddress: null,
      });
    }

    await connectDB();

    // Ensure user has jumpaTag and referralCode (auto-backfill for existing accounts)
    const userDoc = await ensureUserJumpaFields(session.user.id);

    // Asynchronously update lastLoginAt on User model
    User.updateOne(
      { _id: session.user.id },
      { $set: { lastLoginAt: new Date() } },
    ).catch((e) => console.error("[AuthStatus] Failed to update lastLoginAt:", e));

    const selectedCookie = req.cookies.get("selected_wallet_address")?.value;
    let selectedWallet = null;

    if (selectedCookie) {
      selectedWallet = await Wallet.findOne({
        userId: session.user.id,
        address: selectedCookie.toLowerCase(),
      });
    }

    if (!selectedWallet) {
      selectedWallet = await Wallet.findOne({ userId: session.user.id });
    }

    // Build referral link
    const origin =
      req.nextUrl.origin ||
      environment.NEXT_PUBLIC_APP_URL;
    const referralCode = userDoc?.referralCode || (session.user as any).referralCode || "";
    const referralLink = referralCode
      ? `${origin}/signup?ref=${referralCode}`
      : "";

    const response = NextResponse.json({
      authenticated: true,
      hasWallet: !!selectedWallet,
      selectedAddress: selectedWallet?.address || null,
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        image: session.user.image,
        jumpaTag: userDoc?.jumpaTag || (session.user as any).jumpaTag || null,
        referralCode: referralCode || null,
        referralLink: referralLink || null,
        wallet: selectedWallet
          ? {
              address: selectedWallet.address,
              name: selectedWallet.name,
              addresses: selectedWallet.addresses,
            }
          : null,
      },
    });

    if (selectedWallet) {
      response.cookies.set("selected_wallet_address", selectedWallet.address, {
        path: "/",
        httpOnly: true,
        secure: environment.IS_PRODUCTION,
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60, // 7 days
      });
    } else if (selectedCookie) {
      response.cookies.delete("selected_wallet_address");
    }

    return response;
  } catch (err) {
    console.error("[Auth] Error checking status:", err);
    return NextResponse.json(
      { authenticated: false, hasWallet: false, selectedAddress: null },
      { status: 500 },
    );
  }
}
