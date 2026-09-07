import { type NextRequest, NextResponse } from "next/server";
import { getSwapQuote } from "@/lib/dex";
import { swapQuoteSchema } from "@/lib/validations/swap.validation";
import { formatZodError } from "@/lib/validations/validation-helper";

/**
 * POST /api/swap/quote
 * Body: { chain?: string, assetIn: string, assetOut: string, amount: string, slippageTolerance?: number, network?: "testnet" | "mainnet" }
 * Returns active live DEX quote (e.g. Soroswap on Stellar).
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const validation = swapQuoteSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(formatZodError(validation.error), { status: 400 });
    }

    const {
      chain = "stellar",
      assetIn,
      assetOut,
      amount,
      tradeType = "EXACT_IN",
      slippageTolerance = 0.5,
      network = "testnet",
    } = validation.data;

    const quote = await getSwapQuote({
      chain,
      assetIn,
      assetOut,
      amount,
      tradeType: (tradeType as any) || "EXACT_IN",
      slippageTolerance,
      network,
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
