import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { requireActiveUser } from "@/lib/functions/permissionFunctions";
import {
  findWalletForUser,
  findWalletById,
  updateWalletPin,
} from "@/lib/functions/walletFunctions";
import {
  getUserById,
  setUserLoginPassword,
  logUserActivity,
} from "@/lib/functions/userFunctions";
import { triggerWalletBackgroundUpdates } from "@/lib/services/wallet-migration";
import { verifyWalletPin } from "@/lib/execution/verify-pin";
import { decryptMnemonic } from "@/lib/crypto";
import { createNotification } from "@/lib/functions/notificationFunctions";
import { changePinSchema } from "@/lib/validations/wallet.validation";
import {
  verifyPinSchema,
  migratePinSchema,
} from "@/lib/validations/user.validation";
import { formatZodError } from "@/lib/validations/validation-helper";
import { connectDB, getDb } from "@/lib/db";
import { normalizeEmail } from "@/lib/utils/email-policy";
import { environment } from "@/lib/environment";
import { formatOneLineError } from "@/lib/utils/api-best-practices";

/**
 * Atomically verifies and consumes the email verification OTP from Better-Auth's verification table.
 * Deletes the record on success to prevent any replay attack.
 */
async function verifyAndConsumeEmailOtp(
  email: string,
  otp: string,
): Promise<{ ok: boolean; error?: string }> {
  await connectDB();
  const db = getDb();
  const normalized = normalizeEmail(email);
  const identifier = `email-verification-otp-${normalized}`;

  const verificationRecord = await db.collection("verification").findOne({
    identifier,
  });

  if (!verificationRecord) {
    return { ok: false, error: "Invalid or expired verification code." };
  }

  if (new Date(verificationRecord.expiresAt) < new Date()) {
    await db.collection("verification").deleteOne({ identifier });
    return {
      ok: false,
      error: "Verification code has expired. Please request a new one.",
    };
  }

  // Format in better-auth email-otp: `${storedOtp}:${attempts}`
  const rawValue = String(verificationRecord.value || "");
  const lastColonIndex = rawValue.lastIndexOf(":");
  const storedOtp =
    lastColonIndex === -1 ? rawValue : rawValue.slice(0, lastColonIndex);
  const attemptsStr =
    lastColonIndex === -1 ? "0" : rawValue.slice(lastColonIndex + 1);
  const attempts = parseInt(attemptsStr, 10) || 0;

  if (attempts >= 3) {
    await db.collection("verification").deleteOne({ identifier });
    return {
      ok: false,
      error: "Too many failed attempts. Please request a new code.",
    };
  }

  if (storedOtp !== otp.trim()) {
    await db.collection("verification").updateOne(
      { identifier },
      { $set: { value: `${storedOtp}:${attempts + 1}` } },
    );
    return {
      ok: false,
      error: "That code isn't right. Check the 6 digits and try again.",
    };
  }

  // Atomically delete the token so it cannot be used again
  await db.collection("verification").deleteOne({ identifier });
  return { ok: true };
}

/**
 * POST /api/v1/wallet/pin
 *
 * Query Parameter Dispatch:
 * - ?action=verify: Verifies transaction PIN against bcrypt hash with 15-minute lockout protection after 5 failed attempts.
 * - ?action=update: Changes transaction or login PIN using current PIN or email OTP.
 */
export async function POST(req: NextRequest) {
  const action = req.nextUrl.searchParams.get("action") || "verify";

  // ACTION: VERIFY PIN
  if (action === "verify") {
    const auth = await requireActiveUser({
      rateLimit: { tier: "critical", action: "verify_pin" },
    });
    if (!auth.ok) return auth.response;

    const body = await req.json().catch(() => ({}));
    const validation = verifyPinSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(formatZodError(validation.error), {
        status: 400,
      });
    }

    const { pin } = validation.data;
    const wallet = await findWalletForUser(auth.userId);

    if (!wallet) {
      return NextResponse.json(
        { success: false, error: "Wallet not found" },
        { status: 404 },
      );
    }

    const pinCheck = await verifyWalletPin(wallet, pin, {
      userId: auth.userId,
    });

    if (!pinCheck.ok) {
      return NextResponse.json(
        {
          success: false,
          error: pinCheck.error,
        },
        { status: pinCheck.status || 401 },
      );
    }

    return NextResponse.json({
      success: true,
    });
  }

  // ACTION: UPDATE PIN
  if (action === "update") {
    try {
      const authResult = await requireActiveUser({
        rateLimit: { tier: "critical", action: "change_pin" },
      });
      if (!authResult.ok) return authResult.response;
      const session = authResult.session;

      const body = await req.json().catch(() => ({}));
      const validation = changePinSchema.safeParse(body);
      if (!validation.success) {
        return NextResponse.json(formatZodError(validation.error), {
          status: 400,
        });
      }

      const { currentPin, newPin, otp, kind } = validation.data;

      // Gate: if currentPin is omitted (forgot flow), verify and consume email OTP
      if (!currentPin) {
        if (!otp) {
          return NextResponse.json(
            { error: "Verification code is required to reset PIN" },
            { status: 400 },
          );
        }
        const otpCheck = await verifyAndConsumeEmailOtp(
          session.user.email,
          otp,
        );
        if (!otpCheck.ok) {
          return NextResponse.json({ error: otpCheck.error }, { status: 400 });
        }
      }

      // Branch A: Login PIN (6 digits)
      if (kind === "login") {
        const user = await getUserById(session.user.id);
        if (!user) {
          return NextResponse.json(
            { error: "User not found" },
            { status: 404 },
          );
        }

        if (currentPin) {
          if (!user.loginPasswordHash) {
            return NextResponse.json(
              { error: "Login PIN is not set on this account" },
              { status: 400 },
            );
          }
          const isValid = await bcrypt.compare(
            currentPin,
            user.loginPasswordHash,
          );
          if (!isValid) {
            return NextResponse.json(
              { error: "Incorrect current login PIN" },
              { status: 400 },
            );
          }
        }

        const loginPasswordHash = await bcrypt.hash(newPin, 10);
        const updatedUser = await setUserLoginPassword(
          session.user.id,
          loginPasswordHash,
        );
        if (!updatedUser) {
          return NextResponse.json(
            { error: "Failed to update login PIN" },
            { status: 500 },
          );
        }

        logUserActivity({
          userId: session.user.id,
          action: "PIN_CHANGED",
          details: { kind: "login", mode: currentPin ? "change" : "forgot" },
          req,
        }).catch((e) =>
          console.error(`[Wallet] Log error: ${formatOneLineError(e)}`),
        );

        createNotification({
          userId: session.user.id,
          tab: "activities",
          type: "PIN_CHANGED",
          title: "Login PIN Updated",
          body: "Your login PIN was successfully updated",
          metadata: { kind: "login" },
          link: "/profile/settings?section=security",
        }).catch((e) =>
          console.error(`[Wallet] Log error: ${formatOneLineError(e)}`),
        );

        const response = NextResponse.json({
          success: true,
          message: "Login PIN successfully updated",
        });

        // Keep user's active session unlocked
        response.cookies.set("jumpa_unlocked", "true", {
          path: "/",
          sameSite: "lax",
          secure: environment.IS_PRODUCTION,
          maxAge: 15 * 60,
        });

        return response;
      }

      // Branch B: Transaction PIN (4 digits stored on Wallet.pinHash)
      const wallet = await findWalletForUser(session.user.id);
      if (!wallet) {
        return NextResponse.json(
          { error: "Wallet not found" },
          { status: 404 },
        );
      }

      if (currentPin) {
        const pinCheck = await verifyWalletPin(wallet, currentPin, {
          userId: session.user.id,
        });

        if (!pinCheck.ok) {
          return NextResponse.json(
            { error: pinCheck.error },
            { status: pinCheck.status },
          );
        }

        let rawSecret: string;
        try {
          rawSecret = decryptMnemonic(
            wallet.encryptedMnemonic,
            wallet.iv,
            wallet.salt,
            currentPin,
          );
        } catch {
          return NextResponse.json(
            { error: "Failed to decrypt wallet with current PIN" },
            { status: 400 },
          );
        }

        const updated = await updateWalletPin({
          userId: session.user.id,
          walletId: wallet._id,
          newPin,
          rawSecret,
        });

        if (!updated) {
          return NextResponse.json(
            { error: "Failed to update wallet PIN" },
            { status: 500 },
          );
        }
      } else {
        // Forgot flow: enforce v3 wallet requirement
        if (wallet.pinVersion !== "v3") {
          return NextResponse.json(
            {
              error:
                "This wallet cannot be recovered this way. Please contact support for assistance.",
            },
            { status: 400 },
          );
        }

        const updated = await updateWalletPin({
          userId: session.user.id,
          walletId: wallet._id,
          newPin,
        });

        if (!updated) {
          return NextResponse.json(
            { error: "Failed to update wallet PIN" },
            { status: 500 },
          );
        }
      }

      logUserActivity({
        userId: session.user.id,
        action: "PIN_CHANGED",
        details: {
          kind: "transaction",
          walletId: wallet._id,
          mode: currentPin ? "change" : "forgot",
        },
        req,
      }).catch((e) =>
        console.error(`[Wallet] Log error: ${formatOneLineError(e)}`),
      );

      createNotification({
        userId: session.user.id,
        tab: "activities",
        type: "PIN_CHANGED",
        title: "Transaction PIN Updated",
        body: "Your transaction PIN was successfully updated",
        metadata: { kind: "transaction", walletId: wallet._id },
        link: "/profile/settings?section=security",
      }).catch((e) =>
        console.error(`[Wallet] Log error: ${formatOneLineError(e)}`),
      );

      return NextResponse.json({
        success: true,
        message: "Transaction PIN successfully updated",
      });
    } catch (err: any) {
      console.error(`[Wallet] Log error: ${formatOneLineError(err)}`);
      return NextResponse.json(
        {
          success: false,
          error:
            err?.message ||
            "Unable to update PIN at this time. Please try again.",
        },
        { status: 500 },
      );
    }
  }

  // ACTION: MIGRATE PIN (v1 -> v3)
  if (action === "migrate") {
    try {
      const authResult = await requireActiveUser({
        rateLimit: { tier: "critical", action: "migrate_pin" },
      });
      if (!authResult.ok) return authResult.response;
      const session = authResult.session;

      const body = await req.json().catch(() => ({}));
      const validation = migratePinSchema.safeParse(body);
      if (!validation.success) {
        return NextResponse.json(formatZodError(validation.error), {
          status: 400,
        });
      }

      const isConfirmExisting =
        validation.data.action === "confirm-existing" ||
        Boolean(body.existing4DigitPin) ||
        (!validation.data.oldPin && Boolean(validation.data.pin));

      // Pre-validation path: Verify current 6-digit PIN before prompting for new PIN
      if (
        body.action === "validate-current" ||
        body.action === "verify-current"
      ) {
        const oldPin = (validation.data.oldPin || body.pin)!;

        const user = await getUserById(session.user.id);
        const wallet = user?.activeWalletId
          ? await findWalletById(user.activeWalletId)
          : await findWalletForUser(session.user.id);

        if (!wallet) {
          return NextResponse.json(
            { success: false, error: "No active wallet found" },
            { status: 404 },
          );
        }

        const isMatch = await bcrypt.compare(oldPin, wallet.pinHash);
        if (!isMatch) {
          return NextResponse.json(
            {
              success: false,
              error: "Incorrect current PIN. Please try again.",
            },
            { status: 400 },
          );
        }

        try {
          decryptMnemonic(
            wallet.encryptedMnemonic,
            wallet.iv,
            wallet.salt,
            oldPin,
          );
        } catch (decryptErr) {
          console.error(
            `[MigratePIN] Decryption failed for wallet ${wallet._id}:`,
            decryptErr,
          );
          return NextResponse.json(
            {
              success: false,
              error:
                "PIN verified, but unable to decrypt wallet. Please contact support.",
            },
            { status: 400 },
          );
        }

        // Trigger background migration to v3 and Tron derivation (non-blocking, zero lag)
        if (wallet.pinVersion !== "v3" || !wallet.addresses?.trx) {
          void triggerWalletBackgroundUpdates({
            walletId: wallet._id,
            userId: session.user.id,
            pin: oldPin,
          });
        }

        return NextResponse.json({
          success: true,
          data: { message: "Current PIN verified successfully" },
        });
      }

      // Fallback path: User already has a 4-digit PIN and wants to confirm it
      if (isConfirmExisting) {
        const pinCandidate = (validation.data.existing4DigitPin ||
          validation.data.pin ||
          validation.data.oldPin)!;

        const user = await getUserById(session.user.id);
        const wallet = user?.activeWalletId
          ? await findWalletById(user.activeWalletId)
          : await findWalletForUser(session.user.id);

        if (!wallet) {
          return NextResponse.json(
            { success: false, error: "No active wallet found" },
            { status: 404 },
          );
        }

        const isMatch = await bcrypt.compare(pinCandidate, wallet.pinHash);
        if (!isMatch) {
          return NextResponse.json(
            {
              success: false,
              error: "Incorrect PIN. Please try again or update your PIN.",
            },
            { status: 400 },
          );
        }

        try {
          decryptMnemonic(
            wallet.encryptedMnemonic,
            wallet.iv,
            wallet.salt,
            pinCandidate,
          );
        } catch (decryptErr) {
          console.error(
            `[MigratePIN] Decryption failed for wallet ${wallet._id} with 4-digit PIN:`,
            decryptErr,
          );
          return NextResponse.json(
            {
              success: false,
              error:
                "PIN verified, but unable to decrypt wallet. Please contact support.",
            },
            { status: 400 },
          );
        }

        // Trigger background migration to v3 and Tron derivation (non-blocking, zero lag)
        void triggerWalletBackgroundUpdates({
          walletId: wallet._id,
          userId: session.user.id,
          pin: pinCandidate,
        });

        return NextResponse.json({
          success: true,
          data: { message: "PIN confirmed and updated" },
        });
      }

      // Standard path: Migrating from 6-digit old PIN to new 4-digit PIN
      const oldPin = validation.data.oldPin!;
      const newPin = validation.data.newPin!;

      const user = await getUserById(session.user.id);
      const wallet = user?.activeWalletId
        ? await findWalletById(user.activeWalletId)
        : await findWalletForUser(session.user.id);

      if (!wallet) {
        return NextResponse.json(
          { success: false, error: "No active wallet found to migrate" },
          { status: 404 },
        );
      }

      const isMatch = await bcrypt.compare(oldPin, wallet.pinHash);
      if (!isMatch) {
        return NextResponse.json(
          {
            success: false,
            error: "Incorrect current PIN. Please try again.",
          },
          { status: 400 },
        );
      }

      let rawSecret: string;
      try {
        rawSecret = decryptMnemonic(
          wallet.encryptedMnemonic,
          wallet.iv,
          wallet.salt,
          oldPin,
        );
      } catch (decryptErr) {
        console.error(
          `[MigratePIN] Failed to decrypt active wallet ${wallet._id}:`,
          decryptErr,
        );
        return NextResponse.json(
          {
            success: false,
            error: "Failed to decrypt wallet with provided PIN.",
          },
          { status: 400 },
        );
      }

      const updatedWallet = await updateWalletPin({
        userId: session.user.id,
        walletId: wallet._id,
        newPin,
        rawSecret,
      });

      if (!updatedWallet) {
        return NextResponse.json(
          { success: false, error: "Failed to update wallet PIN" },
          { status: 500 },
        );
      }

      logUserActivity({
        userId: session.user.id,
        action: "PIN_MIGRATED",
        details: { walletId: wallet._id },
        req,
      }).catch((e) =>
        console.error(`[MigratePIN] ActivityLog error: ${formatOneLineError(e)}`),
      );

      createNotification({
        userId: session.user.id,
        tab: "activities",
        type: "PIN_MIGRATED",
        title: "Transaction PIN Updated",
        body: "Your transaction PIN was updated",
        metadata: { walletId: wallet._id },
        link: "/profile/settings?section=security",
      }).catch((e) =>
        console.error(`[MigratePIN] Notification error: ${formatOneLineError(e)}`),
      );

      return NextResponse.json({
        success: true,
        data: { message: "PIN updated" },
      });
    } catch (err: any) {
      console.error(`[MigratePIN] Error: ${formatOneLineError(err)}`);
      return NextResponse.json(
        { success: false, error: "Internal Server Error" },
        { status: 500 },
      );
    }
  }

  return NextResponse.json(
    {
      success: false,
      error: `Invalid action "${action}". Please provide a valid action`,
    },
    { status: 400 },
  );
}
