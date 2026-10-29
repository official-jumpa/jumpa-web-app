import { NextRequest, NextResponse } from "next/server";
import { requireActiveUser } from "@/lib/functions/permissionFunctions";
import { Connection, PublicKey } from "@solana/web3.js";
import { findWalletForUser } from "@/lib/functions/walletFunctions";
import { CCTP_DOMAINS, getRpcUrl, getSolanaRpcUrl } from "@/lib/blockchain";
import { getLiveRates } from "@/lib/rates";
import { createPublicClient, http } from "viem";
import { mainnet, base } from "viem/chains";
import { bridgeQuoteSchema } from "@/lib/validations/bridge.validation";
import { formatZodError } from "@/lib/validations/validation-helper";
import { formatOneLineError } from "@/lib/utils/api-best-practices";

/**
 * POST /api/v1/bridge/quote
 * Calculates cross-chain USDC bridge fees, gas abstraction, arrival time, and net received amount.
 */
export async function POST(req: NextRequest) {
  try {
    const authResult = await requireActiveUser({
      rateLimit: { tier: "medium", action: "bridge_quote" },
    });
    if (!authResult.ok) return authResult.response;

    const body = await req.json().catch(() => ({}));
    const validation = bridgeQuoteSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(formatZodError(validation.error), {
        status: 400,
      });
    }

    const { fromChain, toChain, amount, transferType = "fast" } = validation.data;
    const numAmount = parseFloat(amount);

    const isStellarSource = fromChain === "stellar";
    const isEvmSource = fromChain === "base" || fromChain === "ethereum";
    const isSolanaSource = fromChain === "solana";

    let protocolFeeBps = 0;
    let estimatedTime = "~15–30 seconds";
    let effectiveTransferType: "standard" | "fast" = "fast";
    let feeAmount = 0;
    let networkFeeAmount = 0;
    let networkFeeName: string | undefined = undefined;
    let networkFeeLabel: string | undefined = undefined;
    let requiresGasAbstraction = false;

    if (toChain === "ethereum") {
      // Destination Ethereum L1 has higher gas minting costs (~175,000 gas units for receiveMessage)
      try {
        const publicClient = createPublicClient({
          chain: mainnet,
          transport: http(getRpcUrl("ethereum"), { timeout: 8000 }),
        });
        const gasPrice = await publicClient.getGasPrice();
        const rates = await getLiveRates();
        const ethPriceUsd = rates.tokens.find((t) => t.symbol === "ETH")?.usd || 2600;
        const mintGasUnits = BigInt(175000);
        const mintFeeWei = (gasPrice * mintGasUnits * BigInt(12)) / BigInt(10);
        const mintFeeUsd = (Number(mintFeeWei) / 1e18) * ethPriceUsd;
        feeAmount = Math.max(0.5, Math.round(mintFeeUsd * 100) / 100);
      } catch (ethGasErr: any) {
        console.warn(`[Bridge] Eth gas quote fallback: ${formatOneLineError(ethGasErr)}`);
        feeAmount = 3.5;
      }
      protocolFeeBps = 0;
      estimatedTime = "~1–3 minutes";
      effectiveTransferType = "fast";
    } else if (isSolanaSource) {
      feeAmount = 0;
      protocolFeeBps = 0;
      estimatedTime = "~15–30 seconds";
      effectiveTransferType = "fast";
      networkFeeName = "Solana network fee";

      // Check user's SOL balance to see if gas abstraction is needed (< 0.003 SOL)
      const userId = authResult.session?.user?.id;
      let userSol = 0;
      if (userId) {
        const wallet = await findWalletForUser(userId);
        const solAddress = wallet?.addresses?.sol;
        if (solAddress) {
          try {
            const solConn = new Connection(getSolanaRpcUrl(), "confirmed");
            const balancePromise = solConn.getBalance(new PublicKey(solAddress));
            const timeoutPromise = new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error("Solana balance lookup timed out")), 8000)
            );
            const lamports = await Promise.race([balancePromise, timeoutPromise]);
            userSol = Number(lamports) / 1e9;
          } catch (solBalErr: any) {
            console.warn(`[Bridge] Solana balance check fallback: ${formatOneLineError(solBalErr)}`);
          }
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

    // Dynamic source network fee for EVM when not already set by Solana.
    if (!networkFeeLabel) {
      if (fromChain === "ethereum") {
        networkFeeName = "Ethereum network fee";
        try {
          const publicClient = createPublicClient({
            chain: mainnet,
            transport: http(getRpcUrl("ethereum"), { timeout: 8000 }),
          });
          const gasPrice = await publicClient.getGasPrice();
          const rates = await getLiveRates();
          const ethPriceUsd = rates.tokens.find((t) => t.symbol === "ETH")?.usd || 2600;
          // ~155,000 gas units for approve + depositForBurn on Ethereum
          const gasUnits = BigInt(155000);
          const feeWei = (gasPrice * gasUnits * BigInt(12)) / BigInt(10);
          const feeEth = Number(feeWei) / 1e18;
          const feeUsd = feeEth * ethPriceUsd;
          networkFeeAmount = Math.max(0.01, Math.round(feeUsd * 100) / 100);
          networkFeeLabel = `~${feeEth.toFixed(5)} ETH (~$${feeUsd.toFixed(2)})`;
        } catch {
          networkFeeLabel = "~0.00085 ETH (~$2.20)";
        }
      } else if (fromChain === "base") {
        networkFeeName = "Base network fee";
        try {
          const publicClient = createPublicClient({
            chain: base,
            transport: http(getRpcUrl("base"), { timeout: 8000 }),
          });
          const gasPrice = await publicClient.getGasPrice();
          const rates = await getLiveRates();
          const ethPriceUsd = rates.tokens.find((t) => t.symbol === "ETH")?.usd || 2600;
          // ~110,000 gas units on Base
          const gasUnits = BigInt(110000);
          const feeWei = gasPrice * gasUnits;
          const feeEth = Number(feeWei) / 1e18;
          const feeUsd = feeEth * ethPriceUsd;
          networkFeeAmount = Math.max(0.001, Math.round(feeUsd * 1000) / 1000);
          networkFeeLabel =
            feeUsd < 0.01 ? "< 0.0001 ETH (< $0.01)" : `~${feeEth.toFixed(6)} ETH (~$${feeUsd.toFixed(2)})`;
        } catch {
          networkFeeLabel = "< 0.0001 ETH (< $0.01)";
        }
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

    const quoteData = {
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
      networkFeeName,
      networkFeeLabel,
      requiresGasAbstraction,
      estimatedTime,
      transferType: effectiveTransferType,
    };

    return NextResponse.json({
      success: true,
      data: quoteData,
    });
  } catch (error: any) {
    console.error(`[Bridge] Quote calculation failed | Details: ${formatOneLineError(error)}`);
    return NextResponse.json(
      { success: false, error: "Failed to calculate bridge quote. Please try again shortly." },
      { status: 500 },
    );
  }
}
