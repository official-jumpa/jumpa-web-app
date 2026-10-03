import { NextRequest, NextResponse } from "next/server";
import { requireActiveUser } from "@/lib/functions/permissionFunctions";
import { findWalletForUser } from "@/lib/functions/walletFunctions";
import { verifyWalletPin } from "@/lib/execution/verify-pin";
import { withdrawNgnSchema } from "@/lib/validations/fossapay.validation";
import { withdrawBellmonieSchema } from "@/lib/validations/bellmonie.validation";
import { formatZodError } from "@/lib/validations/validation-helper";
import { withdrawNgnFiat } from "@/lib/functions/fossapayFunctions";
import { withdrawBellmonieNgnFiat } from "@/lib/functions/bellmonieFunctions";
import { logUserActivity } from "@/lib/functions/userFunctions";
import { invalidateBalanceCache } from "@/lib/wallet-balances";
import { connectDB } from "@/lib/db";
import { NgnAccount } from "@/models/NgnAccount";

/**
 * POST /api/ngn-account/withdraw
 * Executes an NGN withdrawal routing either to Bellmonie (primary) or FossaPay (legacy)
 * based on user's active accounts and explicit `sourceProvider` option.
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

    await connectDB();
    const bellmonieAccount = await NgnAccount.findOne({
      userId,
      provider: "bellmonie",
      status: "active",
    }).lean();

    const requestedProvider = rawBody.sourceProvider;
    // Determine provider: if explicit use it, otherwise default to bellmonie if user has it, else fossapay
    const provider: "bellmonie" | "fossapay" =
      requestedProvider === "fossapay"
        ? "fossapay"
        : requestedProvider === "bellmonie"
          ? "bellmonie"
          : bellmonieAccount
            ? "bellmonie"
            : "fossapay";

    let amount: number;
    let accountNumber: string;
    let bankName: string;
    let bankCode: string | undefined;
    let accountName: string;
    let pin: string;
    let narration: string | undefined;

    if (provider === "bellmonie") {
      const validation = withdrawBellmonieSchema.safeParse(rawBody);
      if (!validation.success) {
        const err = formatZodError(validation.error);
        return NextResponse.json({ success: false, error: err.error }, { status: 400 });
      }
      ({ amount, accountNumber, bankName, bankCode, accountName, pin, narration } = validation.data);
    } else {
      const validation = withdrawNgnSchema.safeParse(rawBody);
      if (!validation.success) {
        const err = formatZodError(validation.error);
        return NextResponse.json({ success: false, error: err.error }, { status: 400 });
      }
      ({ amount, accountNumber, bankName, bankCode, accountName, pin, narration } = validation.data);
    }

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
        provider,
        amount,
        accountNumber,
        bankName,
        accountName,
      },
      req,
    }).catch(() => {});

    // 2. Execute Withdrawal via selected provider engine
    let result: any;
    if (provider === "bellmonie") {
      result = await withdrawBellmonieNgnFiat({
        userId,
        amount,
        accountNumber,
        bankName,
        bankCode,
        accountName,
        narration,
      });
    } else {
      result = await withdrawNgnFiat({
        userId,
        amount,
        accountNumber,
        bankName,
        bankCode,
        accountName,
        narration,
      });
    }

    // Invalidate balance caches
    invalidateBalanceCache(userId);
    if (wallet?.address) {
      invalidateBalanceCache(wallet.address);
    }

    return NextResponse.json({
      success: true,
      data: result,
      provider,
      message: result.isInternal
        ? "Transfer completed successfully"
        : "Withdrawal completed successfully",
    });
  } catch (error: any) {
    console.error("[NGN Withdraw POST] Error:", error.message);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process withdrawal" },
      { status: 400 },
    );
  }
}
