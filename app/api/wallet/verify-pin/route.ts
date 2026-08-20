import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Wallet } from "@/models/Wallet";

const WALLET_PIN_REGEX = /^\d{6}$/;

/**
 * POST /api/wallet/verify-pin
 * Body: { pin: string, address?: string }
 * Verifies PIN against pinHash for the selected wallet.
 */
export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { pin, address: targetAddress } = body as {
    pin?: string;
    address?: string;
  };

  if (!pin || !WALLET_PIN_REGEX.test(pin)) {
    return NextResponse.json(
      { error: "Valid 6-digit PIN required" },
      { status: 400 },
    );
  }

  await connectDB();

  let wallet = null;
  if (targetAddress) {
    wallet = await Wallet.findOne({
      userId: session.user.id,
      address: targetAddress.toLowerCase(),
    });
  }

  if (!wallet) {
    const selectedCookie = req.cookies.get("selected_wallet_address")?.value;
    if (selectedCookie) {
      wallet = await Wallet.findOne({
        userId: session.user.id,
        address: selectedCookie.toLowerCase(),
      });
    }
  }

  if (!wallet) {
    wallet = await Wallet.findOne({ userId: session.user.id });
  }

  if (!wallet) {
    return NextResponse.json(
      { error: "No wallet found for user" },
      { status: 404 },
    );
  }

  const isValid = await bcrypt.compare(pin, wallet.pinHash);

  if (!isValid) {
    return NextResponse.json(
      { valid: false, error: "Incorrect PIN" },
      { status: 401 },
    );
  }

  return NextResponse.json({
    valid: true,
    address: wallet.address,
  });
}
