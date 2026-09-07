import { type NextRequest, NextResponse } from "next/server";
import { buildSwapTransaction } from "@/lib/dex";
import { swapBuildSchema } from "@/lib/validations/swap.validation";
import { formatZodError } from "@/lib/validations/validation-helper";

/**
 * POST /api/swap/build
 * Body: { quote: SwapQuote, fromAddress: string, toAddress?: string, network?: "testnet" | "mainnet" }
 * Constructs unsigned transaction XDR envelope.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const validation = swapBuildSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(formatZodError(validation.error), { status: 400 });
    }

    const { quote, fromAddress, toAddress, network = "testnet" } =
      validation.data;

    const result = await buildSwapTransaction({
      quote,
      fromAddress,
      toAddress: toAddress || fromAddress,
      network,
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
