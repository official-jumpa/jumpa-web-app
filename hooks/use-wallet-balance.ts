"use client";

import { useCallback, useEffect, useState } from "react";
import { useRefreshSignal } from "@/lib/refresh";

const CACHE_KEY = "jumpa_last_balance";

const read = () => {
  try {
    return Number.parseFloat(localStorage.getItem(CACHE_KEY) ?? "") || 0;
  } catch {
    return 0;
  }
};

/**
 * Spendable USDC, in dollars. Seeded from the cache the wallet screens already
 * write so a form can validate on first paint, then refreshed from the API.
 *
 * `ready` is false until a live figure lands — a form must not reject an amount
 * on the strength of a stale zero.
 */
export function useWalletBalance() {
  const [usdc, setUsdc] = useState(0);
  const [ready, setReady] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/wallet/balance");
      if (!res.ok) return;
      const data = await res.json();
      const total = Number.parseFloat(data.totalUsd) || 0;
      const held = (data.tokens ?? [])
        .filter((t: { symbol?: string }) => t.symbol?.toUpperCase() === "USDC")
        .reduce(
          (sum: number, t: { balance?: string }) =>
            sum + (Number.parseFloat(t.balance ?? "") || 0),
          0,
        );
      const resolved = Math.max(total, held);
      setUsdc(resolved);
      setReady(true);
      try {
        localStorage.setItem(CACHE_KEY, resolved.toFixed(2));
      } catch {}
    } catch (err) {
      console.error("[wallet balance]", err);
    }
  }, []);

  useEffect(() => {
    setUsdc(read());
    load();
  }, [load]);

  // A pull-to-refresh re-runs the server tree, which this hook never sees.
  useRefreshSignal(load);

  return {
    usdc,
    ready,
    formatted: `$${usdc.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`,
  };
}
