/**
 * lib/execution/verify-pin.ts
 *
 * Shared PIN verification logic for any route that requires a wallet PIN.
 * Handles bcrypt comparison, failed-attempt tracking, account lockout,
 * and UserActivityLog writes
 */

import bcrypt from "bcryptjs";
import type { IWallet } from "@/models/Wallet";
import { Wallet } from "@/models/Wallet";
import { UserActivityLog } from "@/models/UserActivityLog";

export type PinVerifyResult =
  | { ok: true }
  | { ok: false; error: string; status: 401 };

/**
 * Verify a 6-digit PIN against the wallet's stored bcrypt hash.
 * Tracks failed attempts and locks the wallet for 15 min after 5 failures.
 *
 * @param wallet  - Mongoose wallet document
 * @param pin     - Raw 6-digit PIN from the request
 * @param ctx     - Optional context for activity log entries
 */
export async function verifyWalletPin(
  wallet: IWallet,
  pin: string,
  ctx?: { userId?: string; sessionId?: string },
): Promise<PinVerifyResult> {
  if (!wallet.pinHash) {
    // Wallet has no PIN set — skip verification (dev / migration path)
    console.log("[verifyWalletPin] No pinHash on wallet, skipping check");
    return { ok: true };
  }

  const pinValid = await bcrypt.compare(pin, wallet.pinHash);

  if (!pinValid) {
    const attempts = (wallet.pinAttempts || 0) + 1;
    const isLocked = attempts >= 5;
    const pinLockedUntil = isLocked
      ? new Date(Date.now() + 15 * 60 * 1000)
      : null;

    await Wallet.updateOne(
      { _id: wallet._id },
      { $set: { pinAttempts: attempts, pinLockedUntil } },
    );

    UserActivityLog.create({
      userId: ctx?.userId,
      action: isLocked ? "PIN_LOCKED" : "PIN_FAILED",
      details: { attempts, walletId: wallet._id },
    }).catch((e) => console.error("[verifyWalletPin] ActivityLog error:", e));

    console.warn(
      `[verifyWalletPin] Incorrect PIN for wallet ${wallet._id} (attempt ${attempts}${isLocked ? " — locked" : ""})`,
    );

    return { ok: false, error: "Incorrect PIN", status: 401 };
  }

  // Success — reset attempts
  if (wallet.pinAttempts !== 0) {
    await Wallet.updateOne(
      { _id: wallet._id },
      { $set: { pinAttempts: 0, pinLockedUntil: null } },
    );
  }

  UserActivityLog.create({
    userId: ctx?.userId,
    action: "PIN_VERIFIED",
    details: { walletId: wallet._id, sessionId: ctx?.sessionId },
  }).catch((e) => console.error("[verifyWalletPin] ActivityLog error:", e));

  return { ok: true };
}
