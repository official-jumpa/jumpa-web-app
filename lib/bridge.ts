import { CHAINS, chainsFor } from "@/lib/blockchain";

/**
 * Cross-chain quoting. There is no bridge provider wired up yet, so the rate
 * and fee below are a deterministic placeholder in the shape the real one will
 * return — the card, the confirmation and the receipt all run off it.
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
};

/** Indicative USD prices, only used until a provider is connected. */
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

/** Flat bridging fee, quoted in the asset that leaves the wallet. */
const FEE_RATE = 0.003;
const SLIPPAGE = "5%";

const trim = (value: number, places = 6) =>
  Number(value.toFixed(places)).toString();

/** Resolve a chain the user named, falling back to where the asset lives. */
export function resolveChain(symbol: string, chain?: string): string {
  const named = chain?.toLowerCase().trim();
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

  const fee = input * FEE_RATE;
  const out = ((input - fee) * fromPrice) / toPrice;
  const fromId = resolveChain(from, fromChain);
  const toId = resolveChain(to, toChain);

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
    fee: `${trim(fee, 4)} ${from}`,
    slippage: SLIPPAGE,
  };
}
