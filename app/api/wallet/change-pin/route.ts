import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { requireActiveUser } from "@/lib/functions/permissionFunctions";
import {
  findWalletForUser,
  updateWalletPin,
} from "@/lib/functions/walletFunctions";
import { verifyWalletPin } from "@/lib/execution/verify-pin";
import { decryptMnemonic } from "@/lib/crypto";
import { logUserActivity } from "@/lib/functions/userFunctions";
import { createNotification } from "@/lib/functions/notificationFunctions";
import { changePinSchema } from "@/lib/validations/wallet.validation";
import { formatZodError } from "@/lib/validations/validation-helper";

/**
 * POST /api/wallet/change-pin
 * Body: { currentPin?: string, newPin: string, kind?: "transaction" | "login" }
 */
export async function POST(req: NextRequest) {
  try {
    const authResult = await requireActiveUser();
    if (!authResult.ok) return authResult.response;
    const session = authResult.session;

    const body = await req.json().catch(() => ({}));
    const validation = changePinSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(formatZodError(validation.error), {
        status: 400,
      });
    }

    const { currentPin, newPin, kind } = validation.data;

    const wallet = await findWalletForUser(session.user.id);

    if (!wallet) {
      return NextResponse.json({ error: "Wallet not found" }, { status: 404 });
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

      // Re-encrypt mnemonic if present
      let rawSecret: string;
      try {
        rawSecret = decryptMnemonic(
          wallet.encryptedMnemonic,
          wallet.iv,
          wallet.salt,
          currentPin,
        );
      } catch (err) {
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
      // Set new pin hash directly if no current PIN required (or forgot flow)
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
      details: { kind, walletId: wallet._id },
      req,
    }).catch((e) => console.error("[ChangePin] ActivityLog error:", e));

    createNotification({
      userId: session.user.id,
      tab: "activities",
      type: "PIN_CHANGED",
      title: `${kind === "login" ? "Login" : "Transaction"} PIN Updated`,
      body: `Your ${kind === "login" ? "login" : "transaction"} PIN was successfully updated`,
      metadata: { kind, walletId: wallet._id },
      link: "/profile/settings?section=security",
    }).catch((e) => console.error("[ChangePin] Notification error:", e));

    return NextResponse.json({
      success: true,
      message: "PIN successfully updated",
    });
  } catch (err: any) {
    console.error("[ChangePin API Error]", err);
    return NextResponse.json(
      { error: err?.message || "Failed to update PIN" },
      { status: 500 },
    );
  }
}
