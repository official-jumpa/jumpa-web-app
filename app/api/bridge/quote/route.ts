import { NextRequest, NextResponse } from "next/server";
import { requireActiveUser } from "@/lib/functions/permissionFunctions";
import { CCTP_DOMAINS } from "@/lib/blockchain";

export async function POST(req: NextRequest) {
  try {
    const authResult = await requireActiveUser({
      rateLimit: { tier: "low", action: "bridge_quote" },
    });
    if (!authResult.ok) return authResult.response;

    const body = await req.json().catch(() => ({}));
    const { fromChain, toChain, amount, transferType = "fast" } = body;

    const numAmount = parseFloat(amount || "0");
    if (isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json(
        { error: "Please enter a valid amount" },
        { status: 400 },
      );
    }

    const isStellarSource = fromChain === "stellar";
    const isEvmSource = fromChain === "base" || fromChain === "ethereum";

    if (!isStellarSource && !isEvmSource) {
      return NextResponse.json(
        { error: "Unsupported source chain" },
        { status: 400 },
      );
    }

    const isEvmDestination = toChain === "base" || toChain === "ethereum";
    if (isStellarSource && !isEvmDestination) {
      return NextResponse.json(
        { error: "Unsupported destination chain for Stellar bridge" },
        { status: 400 },
      );
    }

    let protocolFeeBps = 0;
    let estimatedTime = "~15–30 seconds";
    let effectiveTransferType: "standard" | "fast" = "fast";
    let feeAmount = 0;

    if (isStellarSource) {
      // Stellar -> EVM (Base or Ethereum): Jumpa automated relayer sponsors destination gas (1:1 bridge)
      feeAmount = 0;
      protocolFeeBps = 0;
      estimatedTime = "~15–30 seconds";
      effectiveTransferType = "fast";
    } else {
      // EVM (Base or Ethereum) -> Stellar
      if (transferType === "fast") {
        protocolFeeBps = 13; // 0.13%
        feeAmount = Math.max(0.15, numAmount * (protocolFeeBps / 10000));
        estimatedTime = "~15–30 seconds";
        effectiveTransferType = "fast";
      } else {
        protocolFeeBps = 0;
        feeAmount = 0;
        estimatedTime = "~15–20 minutes";
        effectiveTransferType = "standard";
      }
    }

    const receivedAmount = Math.max(0, numAmount - feeAmount);

    // Circle atomic units (6 decimals for USDC)
    const amountAtomic = BigInt(Math.floor(numAmount * 1_000_000));
    const feeAtomic = BigInt(Math.ceil(feeAmount * 1_000_000));
    // 20% buffer for maxFee safety
    const maxFeeAtomic = (feeAtomic * BigInt(120)) / BigInt(100);

    const fromDomainKey = (fromChain || "stellar") as keyof typeof CCTP_DOMAINS;
    const toDomainKey = (toChain || "ethereum") as keyof typeof CCTP_DOMAINS;

    return NextResponse.json({
      fromChain,
      toChain,
      fromDomain: CCTP_DOMAINS[fromDomainKey] ?? 0,
      toDomain: CCTP_DOMAINS[toDomainKey] ?? 0,
      fromAmount: numAmount.toFixed(6),
      toAmount: receivedAmount.toFixed(6),
      fee: feeAmount.toFixed(6),
      feeBps: protocolFeeBps,
      maxFee: maxFeeAtomic.toString(),
      estimatedTime,
      transferType: effectiveTransferType,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to calculate bridge quote" },
      { status: 500 },
    );
  }
}
