import { formatUnits, parseUnits } from "viem";
import { POLYGON_USDT } from "./constants";

/** A plain decimal with at most the token's six decimals; no sign or exponent. */
export const AMOUNT_PATTERN = /^\d+(\.\d{1,6})?$/;

/** Decimal USDT string → base units. Throws on anything but a positive amount. */
export function toUnits(amount: string): bigint {
  if (!AMOUNT_PATTERN.test(amount)) throw new Error("Enter a valid amount.");
  const units = parseUnits(amount, POLYGON_USDT.decimals);
  if (units <= BigInt(0)) throw new Error("Enter an amount greater than 0.");
  return units;
}

/** Base units → shortest decimal USDT string. */
export function fromUnits(units: bigint): string {
  return formatUnits(units, POLYGON_USDT.decimals);
}

type QuotedMoney = { amount: number; currency: string };

/** Effective Naira per USDT in a quote, fees included, whichever way it runs. */
export function nairaPerUsdt(quote: {
  send: QuotedMoney;
  receive: QuotedMoney;
}): number | undefined {
  const [usdt, naira] =
    quote.send.currency === "USDT"
      ? [quote.send.amount, quote.receive.amount]
      : [quote.receive.amount, quote.send.amount];
  return usdt > 0 && naira > 0 ? naira / usdt : undefined;
}
