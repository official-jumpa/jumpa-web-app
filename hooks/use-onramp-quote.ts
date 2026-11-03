"use client";

import { useEffect, useState } from "react";

/** Waits for typing to settle before asking for a price. */
const DEBOUNCE_MS = 450;

export type OnrampQuote = {
  /** Stablecoin the naira buys; kept from the last quote while a new one loads. */
  received?: number;
  /** Naira per one token. */
  rate?: number;
  loading: boolean;
  error?: string;
};

/** Live naira → stablecoin price for `amount` on `asset` (e.g. "base:usdc"). */
export function useOnrampQuote(amount: number, asset: string): OnrampQuote {
  const [quote, setQuote] = useState<OnrampQuote>({ loading: false });

  useEffect(() => {
    if (!(amount > 0)) {
      setQuote({ loading: false });
      return;
    }

    setQuote((previous) => ({ ...previous, loading: true, error: undefined }));
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch("/api/v1/exchange/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount, asset, direction: "onramp" }),
          signal: controller.signal,
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || "Couldn't get a rate. Try again.");
        }
        const raw = Number(data.rate);
        setQuote({
          loading: false,
          received: Number(data.destination?.amount ?? 0),
          // Some providers quote tokens per naira; the screen always reads naira per token.
          rate: raw > 0 && raw < 1 ? 1 / raw : raw,
        });
      } catch (err) {
        if (controller.signal.aborted) return;
        setQuote({
          loading: false,
          error:
            err instanceof Error
              ? err.message
              : "Couldn't get a rate. Try again.",
        });
      }
    }, DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [amount, asset]);

  return quote;
}
