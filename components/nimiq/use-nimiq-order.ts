"use client";

import { useCallback, useEffect, useState } from "react";
import { NimiqApiError, nimiqApi } from "@/lib/nimiq/api-client";
import { FINAL_STATUSES, type PublicOrder } from "@/lib/nimiq/order-status";

const POLL_MS = 5000;

/** Last known state per order, so a screen opened right after a submit starts filled. */
const known = new Map<string, PublicOrder>();

/** Hands a fresh order to the screen about to show it. */
export function primeOrder(order: PublicOrder) {
  known.set(order.id, order);
}

export const isFinal = (order: PublicOrder) =>
  FINAL_STATUSES.includes(order.status);

/** Polls an order every 5s until it completes, fails or expires. */
export function useNimiqOrder(orderId: string) {
  const [order, setOrder] = useState(() => known.get(orderId));
  const [error, setError] = useState<NimiqApiError>();

  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function tick() {
      try {
        const { order: next } = await nimiqApi.order(orderId, {
          signal: controller.signal,
        });
        known.set(next.id, next);
        setOrder(next);
        setError(undefined);
        if (isFinal(next)) return;
      } catch (failure) {
        if (controller.signal.aborted) return;
        if (failure instanceof NimiqApiError) {
          setError(failure);
          if (failure.status === 404) return;
        }
      }
      timer = setTimeout(tick, POLL_MS);
    }

    void tick();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [orderId]);

  /** Shows a state another call returned, such as a cancel. */
  const replace = useCallback((next: PublicOrder) => {
    known.set(next.id, next);
    setOrder(next);
  }, []);

  return { order, error, replace };
}
