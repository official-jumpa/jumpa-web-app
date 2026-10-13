import { NextRequest, NextResponse } from "next/server";
import { requireActiveUser } from "@/lib/functions/permissionFunctions";
import { findWalletForUser } from "@/lib/functions/walletFunctions";
import { verifyWalletPin } from "@/lib/execution/verify-pin";
import { withdrawBellmonieSchema } from "@/lib/validations/bellmonie.validation";
import { formatZodError } from "@/lib/validations/validation-helper";
import { withdrawBellmonieNgnFiat } from "@/lib/functions/bellmonieFunctions";
import { logUserActivity } from "@/lib/functions/userFunctions";
import { invalidateBalanceCache } from "@/lib/wallet-balances";

/**
 * POST /api/ngn-account/withdraw
 * Executes an NGN withdrawal via Bellmonie.
 * Protected by user wallet PIN authentication.
 */
export async function POST(req: NextRequest) {
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
    }).catch(() => {});

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
      data: result,
      message: result.isInternal
        ? "Transfer completed successfully"
        : "Withdrawal completed successfully",
    });
  } catch (error: any) {
    const rawMessage = error?.message || "";
    console.error("[NGN Withdraw POST] Error:", rawMessage);

    // Sanitize infrastructure, provider, and network errors so users see clear, professional messages
    let userMessage = rawMessage || "Failed to process withdrawal";
    if (
      /bellmonie|token|522|502|503|504|cloudflare|timeout|econnrefused|fetch failed/i.test(
        userMessage,
      )
    ) {
      userMessage =
        "Banking network service is temporarily unavailable. Your balance was refunded, please try again shortly.";
    }

    return NextResponse.json(
      { success: false, error: userMessage },
      { status: 400 },
    );
  }
}
