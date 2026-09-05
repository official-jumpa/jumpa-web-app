import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Wallet } from "@/models/Wallet";
import { verifyWalletPin } from "@/lib/execution/verify-pin";
import { executeSwap } from "@/lib/execution/stellar-swap";
import type { SwapQuote } from "@/lib/dex/types";

const WALLET_PIN_REGEX = /^\d{6}$/;

/**
 * POST /api/swap/execute
 *
 * Standalone swap execution for the /swap UI — no chat session required.
 * The heavy lifting (PIN verification, decrypt → build → sign → submit → DB)
 * is fully delegated to the shared lib/execution utilities.
 *
 * Body:
 *   pin         — 6-digit wallet PIN
 *   rawQuote    — SwapQuote returned by /api/swap/quote
 *   network     — "testnet" | "mainnet"
 *   fromToken   — e.g. "XLM"
 *   toToken     — e.g. "USDC"
 *   fromAmount  — amount the user is swapping
 *   toAmount    — expected receive amount (from quote)
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { pin, rawQuote, network, fromToken, toToken, fromAmount, toAmount } =
      body as {
        pin?: string;
        rawQuote?: SwapQuote;
        network?: "testnet" | "mainnet";
        fromToken?: string;
        toToken?: string;
        fromAmount?: string;
        toAmount?: string;
      };

    if (!pin || !WALLET_PIN_REGEX.test(pin)) {
      return NextResponse.json(
        { error: "Valid 6-digit PIN required" },
        { status: 400 },
      );
    }
    if (!rawQuote || !fromToken || !toToken || !fromAmount) {
      return NextResponse.json(
        { error: "rawQuote, fromToken, toToken and fromAmount are required" },
        { status: 400 },
      );
    }

    await connectDB();
    const userId = session.user.id;
    const wallet = await Wallet.findOne({ userId });

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
      network: network || "testnet",
      fromToken,
      toToken,
      fromAmount,
      toAmount: toAmount || "0",
      userId,
      // No sessionId/messageId — standalone swap, not chat-linked
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
