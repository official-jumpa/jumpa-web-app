import { FLAGS } from "@/lib/flags";
import { COUNTRIES } from "@/lib/transfer";

/**
 * Token and Fiat definitions for Currency Rates & Pricing feeds.
 * Real-time rates are dynamically fetched from the Coinbase Exchange Rates API.
 */

export interface RateToken {
  symbol: string;
  name: string;
  usd?: number;
}

/** The tokens supported and displayed on the Currency Rates screen. */
export const RATE_TOKENS: RateToken[] = [
  { symbol: "XLM", name: "Stellar" },
  { symbol: "USDC", name: "USD Coin" },
  { symbol: "USDT", name: "Tether" },
  { symbol: "ETH", name: "Ethereum" },
  { symbol: "SOL", name: "Solana" },
];

/** Supported fiat currencies and their official display marks. */
export const FIAT_CURRENCIES: Record<string, { symbol: string; name: string }> = {
  USD: { symbol: "$", name: "US Dollar" },
  NGN: { symbol: "₦", name: "Nigerian Naira" },
  GHS: { symbol: "₵", name: "Ghanaian Cedi" },
  KES: { symbol: "KSh", name: "Kenyan Shilling" },
  ZAR: { symbol: "R", name: "South African Rand" },
};

/**
 * Compatibility definition for currency symbols.
 * Real exchange rates must be queried dynamically via getLiveRates().
 */
export const FIAT_RATES: Record<string, { symbol: string; perUsd?: number }> = {
  USD: { symbol: "$" },
  NGN: { symbol: "₦" },
  GHS: { symbol: "₵" },
  KES: { symbol: "KSh" },
  ZAR: { symbol: "R" },
};

/** Derived from the send flow's countries, so the two lists cannot drift. */
export const RATE_CURRENCIES = COUNTRIES.filter(
  ({ code, currency }) => currency in FIAT_CURRENCIES && code in FLAGS,
).map(({ code, currency }) => ({ code: currency, flag: FLAGS[code] }));

/** What the header pill opens on, and what the design draws. */
export const DEFAULT_RATE_CURRENCY = "NGN";

/**
 * Formats a token rate against the selected currency, e.g. `1 XLM = ₦311.23`.
 * Returns "—" if live rates have not yet loaded to avoid showing misleading values.
 */
export function formatRate(
  token: RateToken,
  currency: string,
  customFiatRates?: Record<string, { symbol: string; perUsd: number }>,
): string {
  const fiat = customFiatRates?.[currency];
  if (!token.usd || !fiat?.perUsd) {
    return "—";
  }

  const value = token.usd * fiat.perUsd;
  const amount = value.toLocaleString("en-US", {
    minimumFractionDigits: value < 10 ? 2 : 0,
    maximumFractionDigits: value >= 100 ? 0 : 2,
  });
  return `1 ${token.symbol} = ${fiat.symbol}${amount}`;
}

export interface LiveRatesResult {
  tokens: RateToken[];
  fiatRates: Record<string, { symbol: string; perUsd: number }>;
  timestamp: number;
}

declare global {
  var _liveRatesCache: { timestamp: number; data: LiveRatesResult } | undefined;
}

const CACHE_TTL_MS = 60 * 1000; // 1 minute in-memory cache

/**
 * Fetches real-time crypto and fiat rates from Coinbase Public Exchange Rates API.
 * In case of temporary network failure, smoothly falls back to secondary sources or cache.
 */
export async function getLiveRates(): Promise<LiveRatesResult> {
  const now = Date.now();
  if (globalThis._liveRatesCache && now - globalThis._liveRatesCache.timestamp < CACHE_TTL_MS) {
    return globalThis._liveRatesCache.data;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const res = await fetch("https://api.coinbase.com/v2/exchange-rates?currency=USD", {
      headers: { Accept: "application/json" },
      signal: controller.signal,
      next: { revalidate: 60 },
    });
    clearTimeout(timeout);

    if (!res.ok) {
      throw new Error(`Coinbase API returned HTTP ${res.status}`);
    }

    const json = await res.json();
    const rawRates = json?.data?.rates;

    if (!rawRates || typeof rawRates !== "object") {
      throw new Error("Invalid response");
    }

    // 1. Calculate live crypto USD prices (1 USD = X Crypto => 1 Crypto = 1 / X USD)
    const liveTokens: RateToken[] = RATE_TOKENS.map((token) => {
      const rateVal = rawRates[token.symbol];
      if (rateVal) {
        const num = parseFloat(rateVal);
        if (num > 0) {
          const usdPrice = 1 / num;
          return {
            ...token,
            usd: usdPrice > 100 ? Math.round(usdPrice * 100) / 100 : Number(usdPrice.toPrecision(4)),
          };
        }
      }
      return token;
    });

    // 2. Calculate live fiat per USD rates (1 USD = X Fiat)
    const liveFiat: Record<string, { symbol: string; perUsd: number }> = {};
    for (const [code, info] of Object.entries(FIAT_CURRENCIES)) {
      if (code === "USD") {
        liveFiat.USD = { symbol: "$", perUsd: 1 };
        continue;
      }
      const rateVal = rawRates[code];
      if (rateVal) {
        const num = parseFloat(rateVal);
        if (num > 0) {
          liveFiat[code] = {
            symbol: info.symbol,
            perUsd: Math.round(num * 100) / 100,
          };
        }
      }
    }

    const result: LiveRatesResult = {
      tokens: liveTokens,
      fiatRates: liveFiat,
      timestamp: now,
    };

    globalThis._liveRatesCache = {
      timestamp: now,
      data: result,
    };

    return result;
  } catch (err) {
    console.warn("[Rates Service] Live rate fetch failed, trying secondary fallback:", err);

    // If we have an existing cache, reuse it
    if (globalThis._liveRatesCache) {
      return globalThis._liveRatesCache.data;
    }

    // Try secondary Open Exchange Rate API for fiat
    try {
      const res = await fetch("https://open.er-api.com/v6/latest/USD");
      if (res.ok) {
        const data = await res.json();
        const liveFiat: Record<string, { symbol: string; perUsd: number }> = {
          USD: { symbol: "$", perUsd: 1 },
        };
        for (const [code, info] of Object.entries(FIAT_CURRENCIES)) {
          if (data.rates?.[code]) {
            liveFiat[code] = { symbol: info.symbol, perUsd: data.rates[code] };
          }
        }
        const fallbackResult = {
          tokens: RATE_TOKENS,
          fiatRates: liveFiat,
          timestamp: now,
        };
        globalThis._liveRatesCache = { timestamp: now, data: fallbackResult };
        return fallbackResult;
      }
    } catch {
      // Ignore secondary error
    }

    return {
      tokens: RATE_TOKENS,
      fiatRates: {
        USD: { symbol: "$", perUsd: 1 },
      },
      timestamp: now,
    };
  }
}
