"use client";

import { useEffect, useState } from "react";
import { nairaPerUsdt } from "@/lib/nimiq/amounts";
import { nimiqApi } from "@/lib/nimiq/api-client";
import type { NimiqDirection } from "@/lib/nimiq/order-status";
import type { Quote } from "@/lib/nimiq/orders";

const DEBOUNCE_MS = 400;

/**
 * Live Switch quote for an amount. While the amount is empty, `rateAmount` is
 * quoted instead so the screen can still show a rate.
 */
export function useNimiqQuote(
  direction: NimiqDirection,
  amount: number,
  rateAmount: number,
) {
  const [quote, setQuote] = useState<Quote & { amount: number }>();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);

  const target = amount > 0 ? amount : rateAmount;

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const next = await nimiqApi.quote(direction, target, {
          signal: controller.signal,
        });
        setQuote({ ...next, amount: target });
        setError(undefined);
      } catch (failure) {
        if (controller.signal.aborted) return;
        setError((failure as Error).message);
      }
      setLoading(false);
    }, DEBOUNCE_MS);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [direction, target]);

  // A quote for another amount is only a rate, never a figure to confirm.
  const current = amount > 0 && quote?.amount === amount ? quote : undefined;
  return {
    quote: current,
    /** Effective Naira per USDT from the latest quote, for rate lines and limits. */
    perUsdt: quote ? nairaPerUsdt(quote) : undefined,
    error,
    loading,
  };
}
