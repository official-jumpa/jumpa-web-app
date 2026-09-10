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
  BNB: 605,
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

export function chainName(id: string): string {
  return CHAINS[id]?.name ?? id;
}

export function isBridgeable(symbol: string): boolean {
  return PRICES[symbol.toUpperCase()] !== undefined;
}

export function getBridgeQuote({
  fromToken,
  toToken,
  fromChain,
  toChain,
  amount,
}: {
  fromToken: string;
  toToken: string;
  fromChain?: string;
  toChain?: string;
  amount: string;
}): BridgeQuote {
  const from = fromToken.toUpperCase().trim();
  const to = toToken.toUpperCase().trim();

  const fromPrice = PRICES[from];
  const toPrice = PRICES[to];
  if (!fromPrice || !toPrice) {
    throw new Error(`Jumpa cannot bridge ${from} to ${to} yet.`);
  }

  const input = Number.parseFloat(amount);
  if (!Number.isFinite(input) || input <= 0) {
    throw new Error("Enter an amount greater than zero to bridge.");
  }

  const fromId = resolveChain(from, fromChain);
  const toId = resolveChain(to, toChain || (fromId === "base" ? "stellar" : "base"));

  // Calculate Allbridge Core fee: 0.3% LP fee + relayer gas fee
  const lpFee = input * ALLBRIDGE_LP_FEE_RATE;
  const relayerFeeInToken = ALLBRIDGE_RELAYER_FEE_USD / fromPrice;
  const totalFee = lpFee + (from === to ? relayerFeeInToken : 0);

  // Compute output amount after fees
  const netInput = Math.max(0, input - totalFee);
  const out = (netInput * fromPrice) / toPrice;

  return {
    fromToken: from,
    toToken: to,
    fromChain: fromId,
    toChain: toId,
    fromChainName: chainName(fromId),
    toChainName: chainName(toId),
    amountIn: trim(input),
    amountOut: trim(out, 4),
    rate: `1 ${to} = ${trim(toPrice / fromPrice, 4)} ${from}`,
    fee: `${trim(totalFee, 4)} ${from}`,
    slippage: ALLBRIDGE_SLIPPAGE,
    provider: "Allbridge Core (Simulation)",
    relayerFee: `${trim(relayerFeeInToken, 4)} ${from}`,
    estimatedTime: ALLBRIDGE_ESTIMATED_TIME,
  };
}
