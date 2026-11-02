import { getAssetLogo } from "@/lib/assets";
import { FLAGS } from "@/lib/flags";

/** Which ledger the history screen is showing; matches the API's `scope` param. */
export type HistoryScope = "ngn" | "usd" | "crypto";

export const HISTORY_TABS: {
  scope: HistoryScope;
  label: string;
  mark: string;
}[] = [
  { scope: "ngn", label: "Naira (NGN)", mark: FLAGS.NG },
  { scope: "usd", label: "USD", mark: FLAGS.US },
  { scope: "crypto", label: "Crypto", mark: getAssetLogo("BTC") },
];

/** Asset chips on the Crypto tab. USDC sits past the design's last chip, behind the scroll. */
export const HISTORY_ASSETS = [
  "BTC",
  "XLM",
  "ETH",
  "SOL",
  "USDT",
  "USDC",
] as const;

export function isHistoryScope(value?: string | null): value is HistoryScope {
  return value === "ngn" || value === "usd" || value === "crypto";
}

/** Matches a `token` URL value to a chip, case-insensitively. */
export function toHistoryAsset(value?: string | null): string | undefined {
  const upper = value?.toUpperCase();
  return HISTORY_ASSETS.find((asset) => asset === upper);
}

const RANGE_DATE = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

/** The date pill's text for a `7d`/`30d`/`90d` duration; no duration reads "All time". */
export function historyRangeLabel(duration?: string, now = new Date()): string {
  const days = Number.parseInt(duration ?? "", 10);
  if (!days) return "All time";
  const from = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  return `${RANGE_DATE.format(from)} - ${RANGE_DATE.format(now)}`;
}

/** "1 Oct 2026" — the date at the head of a history row's caption. */
export function formatHistoryDay(date: Date): string {
  return RANGE_DATE.format(date);
}

/** "02:34pm" — the time at the tail of a history row's caption. */
export function formatHistoryClock(date: Date): string {
  return date
    .toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
    .replace(" ", "")
    .toLowerCase();
}

const CURRENCY_SIGN: Record<string, string> = { NGN: "₦", USD: "$" };

/** "-50000 NGN" → "-₦50,000.00". Crypto amounts keep their ticker. */
export function formatHistoryAmount(amount: string): string {
  const match = amount.trim().match(/^([+-]?)\s*([\d,.]+)\s*([A-Za-z]*)$/);
  const sign = match && CURRENCY_SIGN[match[3].toUpperCase()];
  if (!match || !sign) return amount;
  const value = Number(match[2].replace(/,/g, ""));
  const locale = sign === "₦" ? "en-NG" : "en-US";
  return `${match[1]}${sign}${value.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
