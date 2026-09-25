/**
 * The two questions every amount field asks about an asset: how many decimals
 * may be typed, and what the entered amount is worth in dollars.
 *
 * Precision is a property of the asset, not a global constant. Two decimals is
 * right for naira and dollars but silently truncates 0.0837 SOL to 0.08 — a 4%
 * loss of intent on a token worth ~$150. Every field reads `decimalsFor`, so
 * adding an asset is one entry here rather than a sweep across the flows.
 */

/** Fiat, and anything not recognised as a token. */
export const FIAT_DECIMALS = 2;

/**
 * The most decimals a field accepts per token: the asset's own on-chain
 * precision, capped at 8 for the UI — nobody types ETH's 18 and the 56px
 * display would not hold it.
 *
 * A value here can only ever be at or below what the chain accepts, so raising
 * one cannot produce an amount the network rejects. Keyed by symbol because
 * that is what every amount screen already has in hand.
 */
export const TOKEN_DECIMALS: Record<string, number> = {
  BTC: 8, // chain 8
  ETH: 8, // chain 18, capped
  SOL: 8, // chain 9, capped
  SUI: 8, // chain 9, capped
  TON: 8, // chain 9, capped
  XLM: 7, // chain 7
  USDC: 6, // chain 6
  USDT: 6, // chain 6
  TRX: 6, // chain 6
};

/** Unknown symbols fall back to fiat precision, which is what shipped before. */
export function decimalsFor(symbol?: string): number {
  if (!symbol) return FIAT_DECIMALS;
  return TOKEN_DECIMALS[symbol.trim().toUpperCase()] ?? FIAT_DECIMALS;
}

/** Below this a figure is printed as a bound, not rounded away to `$0.00`. */
const DUST = 0.0001;

/**
 * Dollars, with more precision under a unit — `$0.15` is a useful figure where
 * `$0.1` is not, and a sub-cent amount says so rather than printing `$0.00`.
 */
export function formatUsd(value: number): string {
  if (value > 0 && value < DUST) return "< $0.0001";
  return `$${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: value < 1 ? 4 : 2,
  })}`;
}

/**
 * `≈ $12.39` beside a token amount. Undefined when there is no price or nothing
 * entered, so a caller renders nothing — `≈ $0.00` reads as a broken rate.
 */
export function usdEquivalent(
  amount: string | number,
  priceUsd: string | number | undefined,
): string | undefined {
  const units = Number(amount);
  const price = Number(priceUsd);
  if (!(units > 0) || !(price > 0)) return undefined;
  const value = units * price;
  // A bound already says it is approximate; "≈ < $0.0001" reads as a typo.
  return value < DUST ? formatUsd(value) : `≈ ${formatUsd(value)}`;
}
