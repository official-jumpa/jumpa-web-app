"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { nimiqApi } from "@/lib/nimiq/api-client";
import type { PublicOrder } from "@/lib/nimiq/order-status";

/**
 * The remembered orders, loaded in one call each time `active` turns on (home or
 * history comes into view), so statuses are current without polling.
 */
export function useOrderHistory(
  ids: string[],
  active: boolean,
  /** The server no longer knows these ids; drop them from this device. Must be stable. */
  onMissing: (...ids: string[]) => void,
) {
  const [orders, setOrders] = useState<PublicOrder[]>();
  const [error, setError] = useState<string>();
  const inFlight = useRef<AbortController>(null);
  const key = ids.join(",");

  const load = useCallback(
    (asked: string[]) => {
      inFlight.current?.abort();
      const controller = new AbortController();
      inFlight.current = controller;
      setError(undefined);
      nimiqApi
        .orders(asked, { signal: controller.signal })
        .then((result) => {
          setOrders(result.orders);
          const known = new Set(result.orders.map((order) => order.id));
          const missing = asked.filter((id) => !known.has(id));
          if (missing.length) onMissing(...missing);
        })
        .catch((failure: Error) => {
          if (!controller.signal.aborted) setError(failure.message);
        });
    },
    [onMissing],
  );

  useEffect(() => {
    if (!active) return;
    if (!key) {
      setOrders([]);
      setError(undefined);
      return;
    }
    load(key.split(","));
    return () => inFlight.current?.abort();
  }, [key, active, load]);

  const reload = useCallback(() => {
    if (key) load(key.split(","));
  }, [key, load]);

  return { orders, error, reload };
}
