import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Wallet } from "@/models/Wallet";

const WALLET_PIN_REGEX = /^\d{6}$/;
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

interface AttemptRecord {
  count: number;
  lockedUntil?: number;
}

const pinAttempts = new Map<string, AttemptRecord>();

/**
 * POST /api/wallet/verify-pin
 * Body: { pin: string, address?: string }
 * Verifies PIN against pinHash for the selected wallet with rate limiting & lockout.
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

  const lockKey = `${session.user.id}:${targetAddress || "default"}`;
  const now = Date.now();
  const attempt = pinAttempts.get(lockKey);

  if (attempt?.lockedUntil && attempt.lockedUntil > now) {
    const remainingMinutes = Math.ceil((attempt.lockedUntil - now) / 60000);
    return NextResponse.json(
      {
        valid: false,
        error: `Too many failed attempts. Try again in ${remainingMinutes} minute(s).`,
      },
      { status: 429 },
    );
  }

  if (!pin || !WALLET_PIN_REGEX.test(pin)) {
    return NextResponse.json(
      { error: "Valid PIN required" },
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
    const currentCount = (attempt?.count || 0) + 1;
    if (currentCount >= MAX_ATTEMPTS) {
      pinAttempts.set(lockKey, {
        count: currentCount,
        lockedUntil: now + LOCKOUT_MS,
      });
      return NextResponse.json(
        {
          valid: false,
          error:
            "Too many failed attempts. Try again in 15 minutes.",
        },
        { status: 429 },
      );
    }

    pinAttempts.set(lockKey, { count: currentCount });
    const remaining = MAX_ATTEMPTS - currentCount;
    return NextResponse.json(
      {
        valid: false,
        error: `Incorrect PIN`,
      },
      { status: 401 },
    );
  }

  // Clear attempts on success
  pinAttempts.delete(lockKey);

  return NextResponse.json({
    valid: true,
    address: wallet.address,
  });
}
