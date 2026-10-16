import { FLAGS } from "@/lib/flags";
import { COUNTRIES } from "@/lib/transfer";
import { formatOneLineError } from "@/lib/utils/api-best-practices";

/**
 * Token and Fiat definitions for Currency Rates & Pricing feeds.
 * Multi-source real-time feed: CoinGecko (primary for all tokens including TRX),
 * Switch & Centiiv (live Jumpa onramp NGN rates), and Open Exchange Rates (African/global fiats).
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
  { symbol: "TRX", name: "Tron" },
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

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour in-memory cache

const COINGECKO_MAP: Record<string, string> = {
  XLM: "stellar",
  USDC: "usd-coin",
  USDT: "tether",
  ETH: "ethereum",
  SOL: "solana",
  TRX: "tron",
};

/**
 * Fetches crypto USD prices across multiple sources (CoinGecko primary, Coinbase & Kraken fallbacks).
 */
async function fetchCryptoPrices(): Promise<Record<string, number>> {
  const prices: Record<string, number> = {};

  // 1. Primary: CoinGecko Simple Price (supports all 6 tokens including TRX in 1 fast call)
  try {
    const cgIds = Object.values(COINGECKO_MAP).join(",");
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${cgIds}&vs_currencies=usd`,
      {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(5000),
      },
    );
    if (res.ok) {
      const data = await res.json();
      for (const [symbol, id] of Object.entries(COINGECKO_MAP)) {
        if (data[id]?.usd) {
          prices[symbol] = data[id].usd;
        }
      }
    }
  } catch (err: any) {
    console.warn(`[Rates Service] CoinGecko fetch failed: ${formatOneLineError(err)}`);
  }

  // 2. Secondary fallback: Coinbase for XLM, USDC, USDT, ETH, SOL
  const missingSymbols = RATE_TOKENS.map((t) => t.symbol).filter((s) => !prices[s]);
  if (missingSymbols.length > 0) {
    try {
      const res = await fetch("https://api.coinbase.com/v2/exchange-rates?currency=USD", {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        const json = await res.json();
        const rawRates = json?.data?.rates;
        if (rawRates) {
          for (const sym of missingSymbols) {
            if (sym !== "TRX" && rawRates[sym]) {
              const num = parseFloat(rawRates[sym]);
              if (num > 0) prices[sym] = 1 / num;
            }
          }
        }
      }
    } catch (err: any) {
      console.warn(`[Rates Service] Coinbase fallback failed: ${formatOneLineError(err)}`);
    }

    // Secondary fallback for TRX specifically: Kraken public ticker
    if (!prices["TRX"]) {
      try {
        const res = await fetch("https://api.kraken.com/0/public/Ticker?pair=TRXUSD", {
          signal: AbortSignal.timeout(4000),
        });
        if (res.ok) {
          const data = await res.json();
          const last = parseFloat(data?.result?.TRXUSD?.c?.[0]);
          if (last > 0) prices["TRX"] = last;
        }
      } catch (err: any) {
        console.warn(`[Rates Service] Kraken TRX fallback failed: ${formatOneLineError(err)}`);
      }
    }
  }

  return prices;
}

/**
 * Fetches fiat exchange rates per USD.
 * - NGN is fetched directly from Jumpa's live onramp provider (Switch/Centiiv) to match actual user pricing.
 * - Secondary fiats (GHS, KES, ZAR) are fetched from Open Exchange Rates.
 */
async function fetchFiatRates(): Promise<Record<string, { symbol: string; perUsd: number }>> {
  const liveFiat: Record<string, { symbol: string; perUsd: number }> = {
    USD: { symbol: "$", perUsd: 1 },
  };

  // 1. Regional African & global fiats from Open Exchange Rates
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD", {
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      const data = await res.json();
      for (const [code, info] of Object.entries(FIAT_CURRENCIES)) {
        if (code === "USD") continue;
        if (data.rates?.[code]) {
          liveFiat[code] = {
            symbol: info.symbol,
            perUsd: Math.round(data.rates[code] * 100) / 100,
          };
        }
      }
    }
  } catch (err: any) {
    console.warn(`[Rates Service] Open ER-API fetch failed: ${formatOneLineError(err)}`);
  }

  // 2. Override NGN with Switch live rate (without developer fee markup)
  try {
    const { SwitchService } = await import("@/lib/switch");
    const switchRateRes = await SwitchService.getOfframpRate("tron:usdt");
    if (switchRateRes.success && switchRateRes.rate && switchRateRes.rate > 0) {
      liveFiat["NGN"] = {
        symbol: "₦",
        perUsd: Math.round(switchRateRes.rate * 100) / 100,
      };
    } else {
      const onrampRes = await SwitchService.getOnrampRate("tron:usdt");
      if (onrampRes.success && onrampRes.rate && onrampRes.rate > 0) {
        liveFiat["NGN"] = {
          symbol: "₦",
          perUsd: Math.round(onrampRes.rate * 100) / 100,
        };
      } else {
        // Fallback: Try Centiiv
        const { getCentiivQuote } = await import("@/lib/functions/centiivFunctions");
        const centiivQuote = await getCentiivQuote({
          fromAsset: "USDC",
          toAsset: "NGN",
          amount: 10,
          network: "STELLAR",
        });
        const centiivRate = parseFloat(centiivQuote.rate);
        if (centiivRate > 0) {
          liveFiat["NGN"] = {
            symbol: "₦",
            perUsd: Math.round(centiivRate * 100) / 100,
          };
        }
      }
    }
  } catch (err: any) {
    console.warn(`[Rates Service] Switch NGN rate fetch failed: ${formatOneLineError(err)}`);
  }

  return liveFiat;
}

/**
 * Fetches real-time crypto and fiat rates.
 * In-memory 60s cache with fallback to stale cache on upstream failure.
 */
export async function getLiveRates(): Promise<LiveRatesResult> {
  const now = Date.now();
  if (globalThis._liveRatesCache && now - globalThis._liveRatesCache.timestamp < CACHE_TTL_MS) {
    return globalThis._liveRatesCache.data;
  }

  try {
    const [prices, liveFiat] = await Promise.all([
      fetchCryptoPrices(),
      fetchFiatRates(),
    ]);

    const liveTokens: RateToken[] = RATE_TOKENS.map((token) => {
      const usdPrice = prices[token.symbol];
      if (usdPrice && usdPrice > 0) {
        return {
          ...token,
          usd: usdPrice > 100 ? Math.round(usdPrice * 100) / 100 : Number(usdPrice.toPrecision(4)),
        };
      }
      return token;
    });

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
  } catch (err: any) {
    console.warn(`[Rates Service] Rate compilation failed: ${formatOneLineError(err)}`);

    // If an existing cache exists, reuse it gracefully
    if (globalThis._liveRatesCache) {
      return globalThis._liveRatesCache.data;
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
