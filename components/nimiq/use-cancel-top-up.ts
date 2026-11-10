"use client";

import { useCallback, useState } from "react";
import { nimiqApi } from "@/lib/nimiq/api-client";
import type { PublicOrder } from "@/lib/nimiq/order-status";

/** Cancels an unpaid top-up on the server; `cancel` resolves true once it's done, `error` is safe to show. */
export function useCancelTopUp(
  address: string,
  /** The order's state after the cancel, usually `cancelled`. */
  onCancelled: (order: PublicOrder) => void,
) {
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string>();

  const cancel = useCallback(
    async (orderId: string): Promise<boolean> => {
      setCancelling(true);
      setError(undefined);
      try {
        const { order } = await nimiqApi.cancelTopUp(orderId, address);
        onCancelled(order);
        return true;
      } catch (failure) {
        setError((failure as Error).message);
        return false;
      } finally {
        setCancelling(false);
      }
    },
    [address, onCancelled],
  );

  return { cancel, cancelling, error };
}
