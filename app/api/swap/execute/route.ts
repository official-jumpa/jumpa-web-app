import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { findWalletForUser } from "@/lib/functions/walletFunctions";
import { verifyWalletPin } from "@/lib/execution/verify-pin";
import { executeSwap } from "@/lib/execution/stellar-swap";
import { swapExecuteSchema } from "@/lib/validations/swap.validation";
import { formatZodError } from "@/lib/validations/validation-helper";

/**
 * POST /api/swap/execute
 * Standalone swap execution for the /swap UI — no chat session required.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const validation = swapExecuteSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(formatZodError(validation.error), { status: 400 });
    }

    const {
      pin,
      rawQuote,
      network = "testnet",
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
