import { useEffect, useState } from "react";

type FiatRates = Record<string, { symbol: string; perUsd: number }>;

/** Matches the server's own cache on `/api/rates`. */
const FRESH_MS = 60_000;

let cached: { rates: FiatRates; at: number } | null = null;
let request: Promise<FiatRates | null> | null = null;

/** One `/api/rates` call however many components ask; a failure is retried on the next ask. */
function loadFiatRates(): Promise<FiatRates | null> {
  if (cached && Date.now() - cached.at < FRESH_MS) {
    return Promise.resolve(cached.rates);
  }
  request ??= fetch("/api/rates")
    .then((res) => (res.ok ? res.json() : null))
    .then((data: { fiatRates?: FiatRates } | null) => {
      if (data?.fiatRates) cached = { rates: data.fiatRates, at: Date.now() };
      return data?.fiatRates ?? null;
    })
    .catch(() => null)
    .finally(() => {
      request = null;
    });
  return request;
}

/**
 * Live units of `code` per US dollar, or `null` until it loads. Callers show
 * nothing on `null` — a guessed rate is worse than no conversion.
 */
export function useFiatRate(code: string): number | null {
  const [rate, setRate] = useState<number | null>(
    () => cached?.rates[code]?.perUsd ?? null,
  );

  useEffect(() => {
    let live = true;
    loadFiatRates().then((rates) => {
      if (live) setRate(rates?.[code]?.perUsd ?? null);
    });
    return () => {
      live = false;
    };
  }, [code]);

  return rate;
}
