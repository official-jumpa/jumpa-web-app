import { NextRequest, NextResponse } from "next/server";
import { requireActiveUser } from "@/lib/functions/permissionFunctions";
import { findWalletForUser } from "@/lib/functions/walletFunctions";
import { verifyWalletPin } from "@/lib/execution/verify-pin";
import { executeBridge } from "@/lib/execution/bridge-execute";
import { invalidateBalanceCache } from "@/lib/wallet-balances";
import { createNotification } from "@/lib/functions/notificationFunctions";
import { bridgeExecuteSchema } from "@/lib/validations/bridge.validation";
import { formatZodError } from "@/lib/validations/validation-helper";
import { formatOneLineError } from "@/lib/utils/api-best-practices";

/**
 * POST /api/v1/bridge/execute
 * Authenticates PIN, enforces daily transaction limits, initiates cross-chain bridge,
 * and spins up background attestation & relay pipeline.
 */
export async function POST(req: NextRequest) {
  try {
    const authResult = await requireActiveUser({
      rateLimit: { tier: "high", action: "bridge_execute" },
    });
    if (!authResult.ok) return authResult.response;
    const session = authResult.session;

    const body = await req.json().catch(() => ({}));
    const validation = bridgeExecuteSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(formatZodError(validation.error), {
        status: 400,
      });
    }

    const {
      pin,
      fromChain,
      toChain,
      amount,
      toAmount,
      recipientAddress,
      transferType = "fast",
      fee = "0.00",
      networkFee,
    } = validation.data;

    const userId = session.user.id;
    const wallet = await findWalletForUser(userId);

    if (!wallet) {
      return NextResponse.json(
        { success: false, error: "Wallet not found" },
        { status: 404 },
      );
    }

    // Verify PIN with lockout protection
    const pinResult = await verifyWalletPin(wallet, pin, { userId });
    if (!pinResult.ok) {
      return NextResponse.json(
        { success: false, error: pinResult.error },
        { status: pinResult.status },
      );
    }

    // Execute bridge transaction pipeline (enforces daily limit and dispatches to chain)
    const result = await executeBridge({
      wallet,
      pin,
      fromChain,
      toChain,
      amount,
      toAmount: toAmount || amount,
      recipientAddress,
      transferType,
      fee,
      networkFee,
      userId,
    });

    if (!result.ok) {
      console.error(
        `[Bridge] Execution failed | Status: ${result.status} | Details: ${formatOneLineError(result.error)}`,
      );
      return NextResponse.json(
        { success: false, error: result.error },
        { status: result.status },
      );
    }

    // Invalidate cached balances
    invalidateBalanceCache(userId);

    // Create user notification in background
    createNotification({
      userId,
      tab: "transactions",
      title: "Bridge Initiated",
      body: `Bridging ${amount} USDC from ${result.fromChain} to ${result.toChain}.`,
      type: "BRIDGE_INITIATED",
    }).catch(() => null);

    const dataPayload = {
      txHash: result.txHash,
      explorerUrl: result.explorerUrl,
      fromChain: result.fromChain,
      toChain: result.toChain,
      sentAmount: result.sentAmount,
      receivedAmount: result.receivedAmount,
      recipientAddress: result.recipientAddress,
      status: result.status,
    };

    return NextResponse.json({
      success: true,
      data: dataPayload,
    });
  } catch (error: any) {
    console.error(
      `[Bridge] Execution error | Details: ${formatOneLineError(error)}`,
    );
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to execute bridge transfer" },
      { status: 500 },
    );
  }
}
