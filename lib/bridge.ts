import { CHAINS, chainsFor } from "@/lib/blockchain";

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

const trim = (value: number, places = 6) =>
  Number(value.toFixed(places)).toString();

/** Jumpa pays the destination mint gas, which outweighs very small transfers. */
export const MIN_BRIDGE_USDC = 5;
export const BRIDGE_MINIMUM_MESSAGE = `The minimum you can bridge is ${MIN_BRIDGE_USDC} USDC.`;

export function isBelowBridgeMinimum(amount: number): boolean {
  return amount < MIN_BRIDGE_USDC;
}

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
 * Circle CCTP v2 Cross-Chain Quoting (Stellar Mainnet, Base Mainnet, Ethereum Mainnet).
 * Cross-chain transfers for USDC settle 1:1 natively across Soroban and EVM TokenMessenger contracts.
 * Jumpa sponsors destination gas on every route except Ethereum, where the user pays the
 * delivery fee out of the amount sent.
 */

export function chainName(id: string): string {
  const low = id.toLowerCase().trim();
  if (low === "stellar") return "Stellar";
  if (low === "ethereum" || low === "eth") return "Ethereum";
  if (low === "base") return "Base";
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
  ethereumDeliveryFeeUsdc = 0,
}: {
  fromToken?: string;
  toToken?: string;
  fromChain?: string;
  toChain?: string;
  amount: string;
  /** From quoteEthereumDeliveryFeeUsdc; only charged when the destination is Ethereum. */
  ethereumDeliveryFeeUsdc?: number;
}): BridgeQuote {
  const from = (fromToken || "USDC").toUpperCase().trim();
  const to = (toToken || "USDC").toUpperCase().trim();

  if (from !== "USDC" || to !== "USDC") {
    throw new Error(
      "Cross-chain bridging is currently supported for USDC across Stellar, Base, and Ethereum.",
    );
  }

  const input = Number.parseFloat(amount);
  if (!Number.isFinite(input) || input <= 0) {
    throw new Error("Enter an amount greater than zero to bridge.");
  }
  if (isBelowBridgeMinimum(input)) {
    throw new Error(BRIDGE_MINIMUM_MESSAGE);
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

  const isEthereumDest = toId === "ethereum";
  const feeNumber = isEthereumDest ? ethereumDeliveryFeeUsdc : 0;
  const feeText = feeNumber > 0 ? `${feeNumber.toFixed(2)} USDC` : "Sponsored";
  const relayerText = feeNumber > 0 ? `${feeNumber.toFixed(2)} USDC` : "Sponsored";
  const estTime = isEthereumDest ? "~1–3 mins" : "~15–30s";
  const outputAmount = Math.max(0, input - feeNumber);

  return {
    fromToken: "USDC",
    toToken: "USDC",
    fromChain: fromId,
    toChain: toId,
    fromChainName: chainName(fromId),
    toChainName: chainName(toId),
    amountIn: trim(input),
    amountOut: trim(outputAmount, 6),
    rate: "1 USDC = 1.0000 USDC",
    fee: feeText,
    slippage: "0.0%",
    provider: "Circle CCTP v2",
    relayerFee: relayerText,
    estimatedTime: estTime,
  };
}
