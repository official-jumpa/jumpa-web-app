import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Wallet } from "@/models/Wallet";

/**
 * GET /api/auth/status
 * Light status check returning authentication status and whether the user owns a wallet.
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

    return NextResponse.json({
      authenticated: true,
      hasWallet: !!selectedWallet,
      selectedAddress: selectedWallet?.address || null,
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
      },
    });
  } catch (err) {
    console.error("[Auth] Error checking status:", err);
    return NextResponse.json(
      { authenticated: false, hasWallet: false, selectedAddress: null },
      { status: 500 },
    );
  }
}
