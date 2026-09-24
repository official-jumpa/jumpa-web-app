import { NextRequest, NextResponse } from "next/server";
import { requireActiveUser } from "@/lib/functions/permissionFunctions";
import { findWalletForUser } from "@/lib/functions/walletFunctions";
import { verifyWalletPin } from "@/lib/execution/verify-pin";
import { withdrawNgnSchema } from "@/lib/validations/fossapay.validation";
import { formatZodError } from "@/lib/validations/validation-helper";
import { withdrawNgnFiat } from "@/lib/functions/fossapayFunctions";
import { logUserActivity } from "@/lib/functions/userFunctions";
import { invalidateBalanceCache } from "@/lib/wallet-balances";

/**
 * POST /api/ngn-account/withdraw
 * Executes an NGN withdrawal from the user's active FossaPay virtual account
 * to an internal FossaPay wallet (₦0 fee) or any other Nigerian bank (tiered fee).
 * Protected by user wallet PIN authentication.
 */
export async function POST(req: NextRequest) {
  try {
    const authResult = await requireActiveUser({
      rateLimit: { tier: "high", action: "ngn_withdraw" },
    });
    if (!authResult.ok) return authResult.response;
    const userId = authResult.userId;

    const body = await req.json().catch(() => ({}));
    const validation = withdrawNgnSchema.safeParse(body);
    if (!validation.success) {
      const err = formatZodError(validation.error);
      return NextResponse.json(
        { success: false, error: err.error },
        { status: 400 }
      );
    }

    const {
      amount,
      accountNumber,
      bankName,
      bankCode,
      accountName,
      pin,
      narration,
    } = validation.data;

    // 1. Verify User's Wallet PIN
    const wallet = await findWalletForUser(userId);
    if (!wallet) {
      return NextResponse.json(
        { success: false, error: "User wallet not found" },
        { status: 404 }
      );
    }

    const pinCheck = await verifyWalletPin(wallet, pin, { userId });
    if (!pinCheck.ok) {
      return NextResponse.json(
        { success: false, error: pinCheck.error || "Incorrect PIN" },
        { status: pinCheck.status || 401 }
      );
    }

    logUserActivity({
      userId,
      action: "WITHDRAWAL_INITIATED",
      details: {
        amount,
        accountNumber,
        bankName,
        accountName,
      },
      req,
    }).catch(() => {});

    // 2. Execute FossaPay Withdrawal
    const result = await withdrawNgnFiat({
      userId,
      amount,
      accountNumber,
      bankName,
      bankCode,
      accountName,
      narration,
    });

    // Invalidate server balance cache so client immediately fetches fresh balances
    invalidateBalanceCache(userId);
    if (wallet?.address) {
      invalidateBalanceCache(wallet.address);
    }

    return NextResponse.json({
      success: true,
      data: result,
      message: result.isInternal
        ? "Transfer completed successfully"
        : "Withdrawal completed successfully",
    });
  } catch (error: any) {
    console.error("[NGN Withdraw POST] Error:", error.message);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process withdrawal" },
      { status: 400 }
    );
  }
}
