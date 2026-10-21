import { NextRequest, NextResponse } from "next/server";
import { requireActiveUser } from "@/lib/functions/permissionFunctions";
import { findWalletForUser } from "@/lib/functions/walletFunctions";
import { verifyWalletPin } from "@/lib/execution/verify-pin";
import { withdrawBellmonieSchema } from "@/lib/validations/bellmonie.validation";
import { formatZodError } from "@/lib/validations/validation-helper";
import { withdrawBellmonieNgnFiat } from "@/lib/functions/bellmonieFunctions";
import { logUserActivity } from "@/lib/functions/userFunctions";
import { invalidateBalanceCache } from "@/lib/wallet-balances";
import { formatOneLineError, isTimeoutError } from "@/lib/utils/api-best-practices";
import { isLimitError } from "@/lib/functions/transactionLimitFunctions";

/**
 * POST /api/v1/ngn-account/withdraw
 * Executes an NGN bank transfer / withdrawal via Bellmonie.
 * Protected by user wallet PIN authentication.
 */
export async function POST(req: NextRequest) {
  const PROVIDER = "Bellmonie";
  const ACTION = "Withdraw";

  try {
    const authResult = await requireActiveUser({
      rateLimit: { tier: "high", action: "ngn_withdraw" },
    });
    if (!authResult.ok) return authResult.response;
    const userId = authResult.userId;

    const rawBody = await req.json().catch(() => ({}));

    const validation = withdrawBellmonieSchema.safeParse(rawBody);
    if (!validation.success) {
      const err = formatZodError(validation.error);
      return NextResponse.json({ success: false, error: err.error }, { status: 400 });
    }
    const { amount, accountNumber, bankName, bankCode, accountName, pin, narration } = validation.data;

    // 1. Verify User's Wallet PIN
    const wallet = await findWalletForUser(userId);
    if (!wallet) {
      return NextResponse.json(
        { success: false, error: "User wallet not found" },
        { status: 404 },
      );
    }

    const pinCheck = await verifyWalletPin(wallet, pin, { userId });
    if (!pinCheck.ok) {
      return NextResponse.json(
        { success: false, error: pinCheck.error || "Incorrect PIN" },
        { status: pinCheck.status || 401 },
      );
    }

    logUserActivity({
      userId,
      action: "WITHDRAWAL_INITIATED",
      details: {
        provider: "bellmonie",
        amount,
        accountNumber,
        bankName,
        accountName,
      },
      req,
    }).catch(() => { });

    // 2. Execute Withdrawal via Bellmonie
    const result = await withdrawBellmonieNgnFiat({
      userId,
      amount,
      accountNumber,
      bankName,
      bankCode,
      accountName,
      narration,
    });

    // Invalidate balance caches
    invalidateBalanceCache(userId);
    if (wallet?.address) {
      invalidateBalanceCache(wallet.address);
    }

    return NextResponse.json({
      success: true,
      data: {
        reference: result.reference,
        fee: result.fee,
        totalDebited: result.totalDebited,
        isInternal: result.isInternal,
        transactionId: result.transactionId,
      },
      message: result.isInternal
        ? "Transfer completed successfully"
        : "Withdrawal completed successfully",
    });
  } catch (error: any) {
    const rawMessage = String(error?.message || "");

    console.error(
      `[${PROVIDER}:${ACTION}] Error: ${formatOneLineError(error)}`,
    );

    if (isLimitError(error)) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 },
      );
    }

    // Friendly sanitized errors - never leak 3rd-party internal text or doctype
    if (isTimeoutError(error) || error.status === 504) {
      return NextResponse.json(
        {
          success: false,
          error: "The transfer request timed out while contacting the banking provider. Please check your transaction history before retrying.",
        },
        { status: 504 },
      );
    }

    if (
      /insufficient|low balance|underfunded/i.test(rawMessage) ||
      error.status === 400
    ) {
      const userMessage = /insufficient|balance/i.test(rawMessage)
        ? "Insufficient Naira balance to complete this transfer."
        : rawMessage && rawMessage.length < 120 && !/<!doctype|<html|bellmonie|token|502|504/i.test(rawMessage)
          ? rawMessage
          : "Unable to complete withdrawal. Please check your account details and try again.";

      return NextResponse.json(
        { success: false, error: userMessage },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "Banking network service is temporarily unavailable. Please try again shortly or check your transaction history for status.",
      },
      { status: 502 },
    );
  }
}
