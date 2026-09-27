import { CHAINS, chainsFor } from "@/lib/blockchain";

/**
 * Cross-chain quoting simulation (Testnet Staging).
 * Note: External bridge pools (such as Allbridge Core) have been paused upstream following
 * their transition away from liquidity pool models. This module provides deterministic
 * mathematical quoting (0.3% LP fee + relayer gas) to stage the cross-chain drawer,
 * card UI, and ledger flow without executing live on-chain settlement.
 */

export type BridgeQuote = {
  fromToken: string;
  toToken: string;
  fromChain: string;
  toChain: string;
  /** Chain display names, for the summary the model reads back. */
  fromChainName: string;
  toChainName: string;
  amountIn: string;
  amountOut: string;
  rate: string;
  fee: string;
  slippage: string;
  provider?: string;
  relayerFee?: string;
  estimatedTime?: string;
};

/** Indicative USD prices for token cross-conversions. */
const PRICES: Record<string, number> = {
  USDC: 1,
  USDT: 1,
  USD: 1,
  XLM: 0.325,
  ETH: 2450,
  SOL: 148,
  TRX: 0.17,
  TON: 3.1,
};

/** Allbridge Core fee structure (0.3% LP pool fee). */
const ALLBRIDGE_LP_FEE_RATE = 0.003;
const ALLBRIDGE_RELAYER_FEE_USD = 0.15;
const ALLBRIDGE_SLIPPAGE = "0.5%";
const ALLBRIDGE_ESTIMATED_TIME = "2-4 minutes";

const trim = (value: number, places = 6) =>
  Number(value.toFixed(places)).toString();

/** Resolve a chain the user named, falling back to where the asset lives. */
export function resolveChain(symbol: string, chain?: string): string {
  const named = chain?.toLowerCase().trim() || "";
  if (named.includes("base")) return "base";
  if (named.includes("stellar") || named.includes("soroban") || named === "xlm") return "stellar";
  if (named.includes("solana") || named === "sol") return "solana";
  if (named.includes("eth")) return "ethereum";
  if (named && CHAINS[named]) return named;

  const [first] = chainsFor(symbol);
  return first?.id ?? "stellar";
}

/**
 * Circle CCTP v2 Cross-Chain Quoting (Stellar Testnet, Ethereum Sepolia, Base Sepolia).
 * Cross-chain transfers for USDC settle 1:1 natively across Soroban and EVM TokenMessenger contracts.
 * Jumpa sponsors destination gas fees for Stellar -> EVM transfers.
 */

export function chainName(id: string): string {
  const low = id.toLowerCase().trim();
  if (low === "stellar") return "Stellar Testnet";
  if (low === "ethereum" || low === "eth") return "Ethereum Sepolia";
  if (low === "base") return "Base Sepolia";
  return CHAINS[id]?.name ?? id;
}

export function isBridgeable(symbol: string): boolean {
  return symbol.toUpperCase().trim() === "USDC";
}

export function getBridgeQuote({
  fromToken,
  toToken,
  fromChain,
  toChain,
  amount,
}: {
  fromToken?: string;
  toToken?: string;
  fromChain?: string;
  toChain?: string;
  amount: string;
}): BridgeQuote {
  const from = (fromToken || "USDC").toUpperCase().trim();
  const to = (toToken || "USDC").toUpperCase().trim();

  if (from !== "USDC" || to !== "USDC") {
    throw new Error(
      "Cross-chain bridging is currently supported for USDC across Stellar Testnet, Ethereum Sepolia, and Base Sepolia.",
    );
  }

  const input = Number.parseFloat(amount);
  if (!Number.isFinite(input) || input <= 0) {
    throw new Error("Enter an amount greater than zero to bridge.");
  }

  if (!fromChain?.trim()) {
    throw new Error("Source network is required.");
  }
  if (!toChain?.trim()) {
    throw new Error("Destination network is required.");
  }

  const fromId = resolveChain(from, fromChain);
  const toId = resolveChain(to, toChain);

  if (fromId === toId) {
    throw new Error(
      "Source and destination networks cannot be the same for a cross-chain bridge. Use swap for same-chain transfers.",
    );
  }

  const isStellarSource = fromId === "stellar";
  const feeText = isStellarSource ? "Free" : "0.00 USDC";
  const estTime = "~15–30s";

  return {
    fromToken: "USDC",
    toToken: "USDC",
    fromChain: fromId,
    toChain: toId,
    fromChainName: chainName(fromId),
    toChainName: chainName(toId),
    amountIn: trim(input),
    amountOut: trim(input, 6),
    rate: "1 USDC = 1.0000 USDC",
    fee: feeText,
    slippage: "0.0%",
    provider: "Circle CCTP v2",
    relayerFee: isStellarSource ? "Sponsored" : "0.00 USDC",
    estimatedTime: estTime,
  };
}
