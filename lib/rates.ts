import { FLAGS } from "@/lib/flags";
import { COUNTRIES } from "@/lib/transfer";

/**
 * Placeholder pricing for the Currency Rates screen. No price feed is wired
 * yet, so both tables below are indicative and deliberately round.
 *
 * They are separate from `lib/bridge.ts`'s table on purpose: that one also
 * gates which tokens the bridge tool accepts, and this screen lists tokens we
 * quote but do not bridge.
 */

/** The tokens the screen lists, in the order the design draws them. */
export const RATE_TOKENS = [
  { symbol: "XLM", name: "Stellar", usd: 0.39 },
  { symbol: "BTC", name: "Bitcoin", usd: 64200 },
  { symbol: "USDC", name: "USD Coin", usd: 1 },
  { symbol: "USDT", name: "Tether", usd: 1 },
  { symbol: "ETH", name: "Ethereum", usd: 3120 },
  { symbol: "SOL", name: "Solana", usd: 148 },
  { symbol: "TRX", name: "Tron", usd: 0.12 },
  { symbol: "TON", name: "Toncoin", usd: 5.2 },
  { symbol: "SUI", name: "Sui", usd: 1.55 },
];

export type RateToken = (typeof RATE_TOKENS)[number];

/** Units of the currency per US dollar, and the mark the rate prints with. */
const FIAT: Record<string, { symbol: string; perUsd: number }> = {
  USD: { symbol: "$", perUsd: 1 },
  NGN: { symbol: "₦", perUsd: 1450 },
  GHS: { symbol: "₵", perUsd: 15.2 },
  KES: { symbol: "KSh", perUsd: 129 },
  ZAR: { symbol: "R", perUsd: 18.4 },
};

/** Derived from the send flow's countries, so the two lists cannot drift. */
export const RATE_CURRENCIES = COUNTRIES.filter(
  ({ code, currency }) => currency in FIAT && code in FLAGS,
).map(({ code, currency }) => ({ code: currency, flag: FLAGS[code] }));

/** What the header pill opens on, and what the design draws. */
export const DEFAULT_RATE_CURRENCY = "NGN";

/** One token's price, e.g. `1 XLM = ₦566`. */
export function formatRate(token: RateToken, currency: string): string {
  const fiat = FIAT[currency] ?? FIAT[DEFAULT_RATE_CURRENCY];
  const value = token.usd * fiat.perUsd;
  const amount = value.toLocaleString("en-US", {
    maximumFractionDigits: value >= 100 ? 0 : 2,
  });
  return `1 ${token.symbol} = ${fiat.symbol}${amount}`;
}
