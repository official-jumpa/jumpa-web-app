"use client";

import { useEffect, useState } from "react";
import { invalidateClientBalances } from "@/lib/client-events";
import { type DepositState, toDepositState } from "@/lib/naira-deposit";

/** Same cadence as the chat's deposit card. */
const POLL_MS = 12_000;

/**
 * Where an on-ramp order is, asked from the moment it exists. The status
 * route is also what settles an order, so asking early is what moves it.
 */
export function useDepositState(reference?: string): DepositState {
  const [entry, setEntry] = useState<{
    reference?: string;
    state: DepositState;
  }>({ state: "awaiting" });
  // A new order starts over rather than inheriting the last one's outcome.
  const state = entry.reference === reference ? entry.state : "awaiting";
  const settled = state === "completed" || state === "failed";

  useEffect(() => {
    if (!reference || settled) return;
    let alive = true;

    const check = async () => {
      try {
        const res = await fetch(
          `/api/v1/exchange/status?reference=${encodeURIComponent(reference)}`,
          { cache: "no-store" },
        );
        const data = await res.json();
        if (!alive || !data?.success) return;
        const next = toDepositState(data);
        if (next === "completed") invalidateClientBalances();
        setEntry({ reference, state: next });
      } catch {
        // A dropped poll is retried on the next tick.
      }
    };

    check();
    const timer = window.setInterval(check, POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") check();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      alive = false;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [reference, settled]);

  return state;
}
