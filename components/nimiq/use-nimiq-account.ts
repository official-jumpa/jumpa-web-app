"use client";

import { useCallback, useEffect, useState } from "react";
import { nimiqApi } from "@/lib/nimiq/api-client";
import type { AccountSummary } from "@/lib/nimiq/orders";

/** USDT balance and what's left of today's limit for the connected wallet. */
export function useNimiqAccount(address: string) {
  const [account, setAccount] = useState<AccountSummary>();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(true);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      setError(undefined);
      try {
        setAccount(await nimiqApi.account(address, { signal }));
      } catch (failure) {
        if (signal?.aborted) return;
        setError((failure as Error).message);
      }
      setLoading(false);
    },
    [address],
  );

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const refresh = useCallback(() => void load(), [load]);

  return { account, error, loading, refresh };
}
