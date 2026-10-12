import { NextRequest, NextResponse } from "next/server";
import { requireActiveUser } from "@/lib/functions/permissionFunctions";
import { Connection, PublicKey } from "@solana/web3.js";
import { findWalletForUser } from "@/lib/functions/walletFunctions";
import { CCTP_DOMAINS, getSolanaRpcUrl } from "@/lib/blockchain";
import { getLiveRates } from "@/lib/rates";

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
    const isSolanaSource = fromChain === "solana";

    if (!isStellarSource && !isEvmSource && !isSolanaSource) {
      return NextResponse.json(
        { error: "Unsupported source chain" },
        { status: 400 },
      );
    }

    const isValidDestination =
      toChain === "base" ||
      toChain === "ethereum" ||
      toChain === "stellar" ||
      toChain === "solana";

    if (!isValidDestination || fromChain === toChain) {
      return NextResponse.json(
        { error: "Invalid bridge destination chain" },
        { status: 400 },
      );
    }

    let protocolFeeBps = 0;
    let estimatedTime = "~15–30 seconds";
    let effectiveTransferType: "standard" | "fast" = "fast";
    let feeAmount = 0;
    let networkFeeAmount = 0;
    let networkFeeLabel: string | undefined = undefined;
    let requiresGasAbstraction = false;

    if (toChain === "ethereum") {
      // Destination Ethereum L1 has higher gas minting costs
      feeAmount = 3.5;
      protocolFeeBps = 0;
      estimatedTime = "~1–3 minutes";
      effectiveTransferType = "fast";
    } else if (isSolanaSource) {
      feeAmount = 0;
      protocolFeeBps = 0;
      estimatedTime = "~15–30 seconds";
      effectiveTransferType = "fast";

      // Check user's SOL balance to see if gas abstraction is needed (< 0.003 SOL)
      const userId = authResult.session?.user?.id;
      let userSol = 0;
      if (userId) {
        const wallet = await findWalletForUser(userId);
        const solAddress = wallet?.addresses?.sol;
        if (solAddress) {
          try {
            const solConn = new Connection(getSolanaRpcUrl(), "confirmed");
            const lamports = await solConn.getBalance(new PublicKey(solAddress));
            userSol = lamports / 1e9;
          } catch {}
        }
      }

      try {
        const rates = await getLiveRates();
        const solToken = rates.tokens.find((t) => t.symbol === "SOL");
        const solPriceUsd = solToken?.usd || 112;
        const solCost = 0.00284698; // 2,824,480 rent + 22,500 gas
        networkFeeAmount = Math.round(solCost * solPriceUsd * 100) / 100;
      } catch {
        networkFeeAmount = 0.32;
      }

      if (userSol < 0.003) {
        // User does not have enough SOL: Jumpa abstracts the fee by sponsoring SOL,
        // and the user pays the network fee in USDC (added to total spend amount).
        requiresGasAbstraction = true;
        networkFeeLabel = `${networkFeeAmount.toFixed(2)} USDC`;
      } else {
        // User has enough SOL to pay native network gas directly
        networkFeeLabel = `~0.00285 SOL (~$${networkFeeAmount.toFixed(2)})`;
      }
    } else if (toChain === "solana") {
      // Solana CCTP fast transfers
      feeAmount = 0;
      protocolFeeBps = 0;
      estimatedTime = "~15–30 seconds";
      effectiveTransferType = "fast";
    } else if (isStellarSource) {
      // Stellar -> Base: Sponsored by Jumpa
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
    // When gas abstraction applies, total USDC spent = amount bridged + networkFeeAmount
    const totalSpendAmount = requiresGasAbstraction
      ? numAmount + networkFeeAmount
      : numAmount;

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
      totalSpendAmount: totalSpendAmount.toFixed(6),
      fee: feeAmount.toFixed(6),
      feeBps: protocolFeeBps,
      maxFee: maxFeeAtomic.toString(),
      networkFee: networkFeeAmount > 0 ? networkFeeAmount.toFixed(2) : undefined,
      networkFeeLabel,
      requiresGasAbstraction,
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
