import { NextRequest, NextResponse } from "next/server";
import { requireActiveUser } from "@/lib/functions/permissionFunctions";
import { findWalletForUser } from "@/lib/functions/walletFunctions";
import { verifyWalletPin } from "@/lib/execution/verify-pin";
import { executeBridge } from "@/lib/execution/bridge-execute";
import { invalidateBalanceCache } from "@/lib/wallet-balances";
import { createNotification } from "@/lib/functions/notificationFunctions";
import { logUserActivity } from "@/lib/functions/userFunctions";

export async function POST(req: NextRequest) {
  try {
    const authResult = await requireActiveUser({
      rateLimit: { tier: "high", action: "bridge_execute" },
    });
    if (!authResult.ok) return authResult.response;
    const session = authResult.session;

    const body = await req.json().catch(() => ({}));
    const {
      pin,
      fromChain,
      toChain,
      amount,
      toAmount,
      recipientAddress,
      transferType = "fast",
      fee = "0.00",
    } = body;

    if (!pin || typeof pin !== "string") {
      return NextResponse.json({ error: "PIN is required" }, { status: 400 });
    }
    if (!amount || parseFloat(amount) <= 0) {
      return NextResponse.json({ error: "Invalid bridge amount" }, { status: 400 });
    }
    if (!recipientAddress) {
      return NextResponse.json({ error: "Recipient address is required" }, { status: 400 });
    }

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

    // Execute bridge transaction
    const result = await executeBridge({
      wallet,
      pin,
      fromChain,
      toChain,
      amount,
      toAmount,
      recipientAddress,
      transferType,
      fee,
      userId,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    // Invalidate cached balances
    invalidateBalanceCache(userId);

    // Create user notification
    await createNotification({
      userId,
      tab: "transactions",
      title: "Bridge Transfer Initiated",
      body: `Bridging ${amount} USDC from ${result.fromChain} to ${result.toChain}.`,
      type: "TRANSFER_SENT",
    }).catch(() => null);

    return NextResponse.json({
      success: true,
      txHash: result.txHash,
      explorerUrl: result.explorerUrl,
      fromChain: result.fromChain,
      toChain: result.toChain,
      sentAmount: result.sentAmount,
      receivedAmount: result.receivedAmount,
      recipientAddress: result.recipientAddress,
      status: result.status,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to execute bridge transfer" },
      { status: 500 },
    );
  }
}
