/**
 * hooks/use-swap-quote.ts
 *
 * Debounced hook that fetches a live DEX quote from POST /api/swap/quote.
 * Re-fetches automatically whenever fromToken, toToken, amount, network,
 * or slippage changes (400 ms debounce). In-flight requests are aborted on
 * rapid changes to avoid stale results.
 */

"use client";

import { useEffect, useRef, useState } from "react";
import type { SwapQuote } from "@/lib/dex/types";

interface UseSwapQuoteParams {
  fromToken: string;
  toToken: string;
  amount: string;
  network: "testnet" | "mainnet";
  slippage: number;
}

interface UseSwapQuoteResult {
  quote: SwapQuote | null;
  loading: boolean;
  error: string | null;
}

export function useSwapQuote(params: UseSwapQuoteParams): UseSwapQuoteResult {
  const [quote, setQuote] = useState<SwapQuote | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { fromToken, toToken, amount, network, slippage } = params;

  useEffect(() => {
    // Clear any running debounce and in-flight request
    if (timerRef.current) clearTimeout(timerRef.current);
    abortRef.current?.abort();

    const numericAmount = Number(amount);
    if (!amount || isNaN(numericAmount) || numericAmount <= 0) {
      setQuote(null);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    timerRef.current = setTimeout(async () => {
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch("/api/swap/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chain: "stellar",
            assetIn: fromToken,
            assetOut: toToken,
            amount,
            slippageTolerance: slippage,
            network,
          }),
          signal: controller.signal,
        });

        const json = await res.json();

        if (!res.ok) {
          setError(json?.error || "Failed to fetch quote");
          setQuote(null);
        } else {
          setQuote(json.quote as SwapQuote);
          setError(null);
        }
      } catch (err: any) {
        if (err?.name !== "AbortError") {
          setError("Could not fetch quote. Please try again.");
          setQuote(null);
        }
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      abortRef.current?.abort();
    };
  }, [fromToken, toToken, amount, network, slippage]);

  return { quote, loading, error };
}
