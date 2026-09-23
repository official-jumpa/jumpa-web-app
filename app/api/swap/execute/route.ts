import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { requireActiveUser } from "@/lib/functions/permissionFunctions";
import { findWalletForUser } from "@/lib/functions/walletFunctions";
import { verifyWalletPin } from "@/lib/execution/verify-pin";
import { executeSwap } from "@/lib/execution/stellar-swap";
import { swapExecuteSchema } from "@/lib/validations/swap.validation";
import { formatZodError } from "@/lib/validations/validation-helper";
import { logUserActivity } from "@/lib/functions/userFunctions";
import { createNotification } from "@/lib/functions/notificationFunctions";

/**
 * POST /api/swap/execute
 * Standalone swap execution for the /swap UI — no chat session required.
 */
export async function POST(req: NextRequest) {
  try {
    const authResult = await requireActiveUser({
      rateLimit: { tier: "high", action: "swap_execute" },
    });
    if (!authResult.ok) return authResult.response;
    const session = authResult.session;

    const body = await req.json().catch(() => ({}));
    const validation = swapExecuteSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(formatZodError(validation.error), { status: 400 });
    }

    const {
      pin,
      rawQuote,
      network = "mainnet",
      fromToken,
      toToken,
      fromAmount,
      toAmount,
    } = validation.data;

    const userId = session.user.id;
    const wallet = await findWalletForUser(userId);

    if (!wallet) {
      return NextResponse.json({ error: "Wallet not found" }, { status: 404 });
    }

    // Verify PIN
    const pinResult = await verifyWalletPin(wallet, pin, { userId });
    if (!pinResult.ok) {
      return NextResponse.json(
        { error: pinResult.error },
        { status: pinResult.status },
      );
    }

    // Execute swap
    const result = await executeSwap({
      wallet,
      pin,
      rawQuote,
      network,
      fromToken,
      toToken,
      fromAmount,
      toAmount: toAmount || "0",
      userId,
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status },
      );
    }

    logUserActivity({
      userId,
      action: "SWAP_EXECUTED",
      details: {
        fromToken,
        toToken,
        fromAmount,
        toAmount,
        txHash: result.txHash,
      },
      req,
    }).catch((e) => console.error("[Swap Execute] ActivityLog error:", e));

    createNotification({
      userId,
      tab: "transactions",
      type: "SWAP_COMPLETED",
      title: "Swap Completed",
      body: `Swapped ${fromAmount} ${fromToken} to ${toAmount} ${toToken}`,
      metadata: {
        fromToken,
        toToken,
        fromAmount,
        toAmount,
        txHash: result.txHash,
      },
      link: "/transactions",
    }).catch((e) => console.error("[Swap Execute] Notification error:", e));

    return NextResponse.json({
      success: true,
      txHash: result.txHash,
      explorerUrl: result.explorerUrl,
    });
  } catch (err: any) {
    console.error("[Swap Execute Error]", err);
    return NextResponse.json(
      { error: err?.message || "Failed to execute swap" },
      { status: 500 },
    );
  }
}
