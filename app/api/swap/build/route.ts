import { type NextRequest, NextResponse } from "next/server";
import { buildSwapTransaction, type SwapBuildRequest } from "@/lib/dex";

/**
 * POST /api/swap/build
 * Body: { quote: SwapQuote, fromAddress: string, toAddress?: string, network?: "testnet" | "mainnet" }
 * Constructs unsigned transaction XDR envelope.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as SwapBuildRequest;

    if (!body.quote || !body.fromAddress) {
      return NextResponse.json(
        { error: "quote and fromAddress are required" },
        { status: 400 },
      );
    }

    const result = await buildSwapTransaction({
      quote: body.quote,
      fromAddress: body.fromAddress,
      toAddress: body.toAddress || body.fromAddress,
      network: body.network || "testnet",
    });

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (err: any) {
    console.error("[Swap Build API Error]", err);
    return NextResponse.json(
      { error: err.message || "Failed to build swap transaction" },
      { status: 500 },
    );
  }
}
