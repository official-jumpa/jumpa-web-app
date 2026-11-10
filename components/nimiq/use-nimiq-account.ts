"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { nimiqApi } from "@/lib/nimiq/api-client";
import { waitForChange } from "@/lib/nimiq/balance";
import type { AccountSummary } from "@/lib/nimiq/orders";

/** USDT balance and what's left of today's limit for the connected wallet. */
export function useNimiqAccount(address: string) {
  const [account, setAccount] = useState<AccountSummary>();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(true);
  const shown = useRef<AccountSummary>(undefined);
  const watch = useRef<AbortController>(null);

  useEffect(() => {
    shown.current = account;
  }, [account]);

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

  useEffect(() => () => watch.current?.abort(), []);

  const refresh = useCallback(() => void load(), [load]);

  /** A background re-read: no spinner, and a failure keeps what's shown. */
  const refreshQuietly = useCallback(async () => {
    try {
      setAccount(await nimiqApi.account(address));
      setError(undefined);
    } catch {
      // The next tick tries again.
    }
  }, [address]);

  /** After an order lands: re-reads until the USDT balance moves, for up to 2 minutes. */
  const refreshUntilChanged = useCallback(async () => {
    watch.current?.abort();
    const controller = new AbortController();
    watch.current = controller;
    setLoading(true);
    setError(undefined);
    await waitForChange<string | undefined>(
      async () => {
        const next = await nimiqApi.account(address, {
          signal: controller.signal,
        });
        setAccount(next);
        return next.usdtBalance;
      },
      shown.current?.usdtBalance,
      // Switch can report a top-up done a while before the USDT lands on Polygon.
      { signal: controller.signal, timeoutMs: 120_000 },
    );
    if (!controller.signal.aborted) setLoading(false);
  }, [address]);

  return {
    account,
    error,
    loading,
    refresh,
    refreshQuietly,
    refreshUntilChanged,
  };
}
