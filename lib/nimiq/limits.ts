import { parseUnits } from "viem";
import { fromUnits } from "./amounts";
import { POLYGON_USDT } from "./constants";

export type AmountLimitInput = {
  usd: number;
  spentTodayUsd: number;
  minUsd: number;
  maxTxUsd: number;
  dailyUsd: number;
};

const dollars = (value: number) => `$${value.toLocaleString("en-US")}`;

/** The reason an amount is refused, or null when it fits every limit. */
export function checkAmountLimits(input: AmountLimitInput): string | null {
  if (input.usd < input.minUsd) {
    return `The smallest amount is ${dollars(input.minUsd)}.`;
  }
  if (input.usd > input.maxTxUsd) {
    return `The most you can move at once is ${dollars(input.maxTxUsd)}.`;
  }
  const remaining = input.dailyUsd - input.spentTodayUsd;
  if (remaining < input.minUsd) {
    return `You've reached today's ${dollars(input.dailyUsd)} limit. Try again tomorrow.`;
  }
  if (input.usd > remaining) {
    // Floored so the figure shown is always one the next attempt can use.
    const left = Math.floor(remaining * 100) / 100;
    return `You can move $${left.toFixed(2)} more today.`;
  }
  return null;
}

/** Base units in one cent of USDT. */
const UNITS_PER_CENT = BigInt(10 ** (POLYGON_USDT.decimals - 2));

/** The most USDT one cash-out can move now, in whole cents: balance, per-transaction cap and today's remainder. */
export function cashOutCeiling(input: {
  balance: string;
  maxTxUsd: number;
  remainingTodayUsd: number;
}): string {
  // The epsilon keeps 0.29 * 100 from flooring to 28 cents.
  const cents = Math.floor(
    Math.min(input.maxTxUsd, input.remainingTodayUsd) * 100 + 1e-9,
  );
  const limitUnits = BigInt(Math.max(0, cents)) * UNITS_PER_CENT;
  // Whole cents, so MAX fills an amount the cent-precision field can hold.
  const balanceUnits =
    (parseUnits(input.balance, POLYGON_USDT.decimals) / UNITS_PER_CENT) *
    UNITS_PER_CENT;
  // BigInts, so no Math.min.
  if (balanceUnits < limitUnits) return fromUnits(balanceUnits);
  return fromUnits(limitUnits);
}

/** The dollar limits in whole Naira at a quoted rate, rounded inward so both ends pass the server's check. */
export function topUpBounds(input: {
  minUsd: number;
  maxTxUsd: number;
  remainingTodayUsd: number;
  perUsdt: number;
}): { min: number; max: number } {
  const most = Math.min(input.maxTxUsd, input.remainingTodayUsd);
  return {
    min: Math.ceil(input.minUsd * input.perUsdt),
    max: Math.max(0, Math.floor(most * input.perUsdt)),
  };
}
