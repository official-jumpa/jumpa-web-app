import {
  DEFAULT_RATE_CURRENCY,
  FIAT_RATES,
  formatRate,
  RATE_CURRENCIES,
  RATE_TOKENS,
} from "@/lib/rates";

/** Seconds a quote holds, as the screen states it. */
export const QUOTE_LOCK_SECONDS = 30;

/** Smallest deposit the rail takes, in US dollars. */
export const DEPOSIT_MINIMUM_USD = 2;

/** The rail's cut, taken off the crypto side. Same figure as `lib/bridge.ts`. */
const FEE_RATE = 0.003;

/** What the user pays in, and what they buy. Both come from the rates table,
 *  so a deposit quote can never disagree with the Currency Rates screen. */
export const DEPOSIT_CURRENCIES = RATE_CURRENCIES;
export const DEPOSIT_TOKENS = RATE_TOKENS;

export const DEFAULT_DEPOSIT_CURRENCY = DEFAULT_RATE_CURRENCY;
export const DEFAULT_DEPOSIT_TOKEN = "USDC";

export type DepositQuote = {
  /** Crypto the deposit buys, net of the fee. */
  receive: string;
  /** The token's price, e.g. `1 USDC = ₦1,450`. */
  rate: string;
  /** The rail's cut, in the token being bought. */
  fee: string;
  /** What the deposit is worth in dollars, which the minimum is checked against. */
  usd: number;
};

/** Two significant figures. A fee of "0.310345 USDC" is noise, not detail. */
function formatFee(value: number): string {
  return Number(value.toPrecision(2)).toLocaleString("en-US", {
    maximumFractionDigits: 10,
  });
}

/** Two decimals above one unit, six below — a price, not a balance. */
function formatToken(value: number): string {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: value >= 1 ? 2 : 0,
    maximumFractionDigits: value >= 1 ? 2 : 6,
  });
}

/**
 * Indicative quote for a fiat deposit. No on-ramp is wired, so this prices off
 * the same static table the Currency Rates screen uses and is deliberately
 * round. Returns null until there is an amount to price.
 */
export function quoteDeposit(
  amount: string,
  currency: string,
  symbol: string,
): DepositQuote | null {
  const paid = Number(amount);
  const fiat = FIAT_RATES[currency];
  const token = DEPOSIT_TOKENS.find((entry) => entry.symbol === symbol);
  if (!paid || !fiat || !token) return null;

  const usd = paid / fiat.perUsd;
  const gross = usd / token.usd;
  const fee = gross * FEE_RATE;

  return {
    receive: formatToken(gross - fee),
    rate: formatRate(token, currency),
    fee: `${formatFee(fee)} ${token.symbol}`,
    usd,
  };
}

/** The bullets under the quote. The token comes from the picker, so the copy
 *  can never name one the user is not buying. */
export function depositInfo(symbol: string): string[] {
  return [
    `Minimum deposit: $${DEPOSIT_MINIMUM_USD}`,
    `Funds auto-convert to ${symbol} and arrive in your Jumpa wallet`,
    "Funds arrive in ~1 minute after confirmation",
  ];
}

/**
 * Placeholder settlement account — visibly not a real one, the same call as
 * `USD_ACCOUNT_FIELDS`. The on-ramp issues these per deposit.
 */
export const DEPOSIT_ACCOUNT = {
  bank: "Jumpa / Test Bank",
  name: "Jumpa Settlement / Test",
  number: "0000 0000 00",
};

/** Reference the rail matches a transfer back to a deposit with. */
export const DEPOSIT_REFERENCE = "JUMPA-0000";

/** How long the confirmation modal holds. Nothing polls a rail yet. */
export const CONFIRMING_MS = 2400;
