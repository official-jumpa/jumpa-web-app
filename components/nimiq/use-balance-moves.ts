"use client";

import { useCallback, useRef } from "react";
import { isBalanceMove, movesOwnBalance } from "@/lib/nimiq/balance";
import type { PublicOrder } from "@/lib/nimiq/order-status";

/** Notes when an order on screen moves this wallet's USDT, so home re-checks the balance once. */
export function useBalanceMoves() {
  const seen = useRef(new Map<string, boolean>());
  const moved = useRef(false);

  /** `fresh` marks an order just created or submitted here, so even a first sighting counts. */
  const note = useCallback((order: PublicOrder, fresh = false) => {
    const wasMoving = seen.current.get(order.id) ?? (fresh ? false : undefined);
    if (isBalanceMove(wasMoving, order)) moved.current = true;
    seen.current.set(order.id, movesOwnBalance(order));
  }, []);

  /** Whether a move happened since the last call. */
  const take = useCallback(() => {
    const result = moved.current;
    moved.current = false;
    return result;
  }, []);

  return { note, take };
}
