import { type NextRequest, NextResponse } from "next/server";
import { getSwapQuote, type SwapQuoteRequest } from "@/lib/dex";

/**
 * POST /api/swap/quote
 * Body: { chain?: string, assetIn: string, assetOut: string, amount: string, slippageTolerance?: number, network?: "testnet" | "mainnet" }
 * Returns active live DEX quote (e.g. Soroswap on Stellar).
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as SwapQuoteRequest;

    if (!body.assetIn || !body.assetOut || !body.amount) {
      return NextResponse.json(
        { error: "assetIn, assetOut, and amount are required" },
        { status: 400 },
      );
    }

    const quote = await getSwapQuote({
      chain: body.chain || "stellar",
      assetIn: body.assetIn,
      assetOut: body.assetOut,
      amount: String(body.amount),
      tradeType: body.tradeType || "EXACT_IN",
      slippageTolerance: body.slippageTolerance ?? 0.5,
      network: body.network || "testnet",
    });

    return NextResponse.json({
      success: true,
      quote,
    });
  } catch (err: any) {
    console.error("[Swap Quote API Error]", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch swap quote" },
      { status: 500 },
    );
  }
}
