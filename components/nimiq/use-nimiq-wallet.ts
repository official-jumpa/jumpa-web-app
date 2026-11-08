"use client";

import { useCallback, useEffect, useState } from "react";
import type { Address } from "viem";
import {
  type Eip1193,
  getConnectedAccount,
  isUserRejection,
  requestAccount,
  waitForInjectedProvider,
} from "@/lib/nimiq/provider";

export type NimiqWallet =
  | { state: "detecting" }
  /** Opened in a normal browser; there is no Nimiq Pay to connect to. */
  | { state: "outside" }
  | {
      state: "disconnected";
      provider: Eip1193;
      connecting: boolean;
      error?: string;
      connect: () => void;
    }
  | { state: "connected"; provider: Eip1193; address: Address };

type Found = { provider: Eip1193 | null; address: Address | null };

/** Finds Nimiq Pay's wallet and the address it has shared with this page. */
export function useNimiqWallet(): NimiqWallet {
  const [found, setFound] = useState<Found | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    let live = true;
    (async () => {
      const provider = await waitForInjectedProvider();
      const address = provider
        ? await getConnectedAccount(provider).catch(() => null)
        : null;
      if (live) setFound({ provider, address });
    })();
    return () => {
      live = false;
    };
  }, []);

  const provider = found?.provider ?? null;

  const connect = useCallback(async () => {
    if (!provider) return;
    setConnecting(true);
    setError(undefined);
    try {
      const address = await requestAccount(provider);
      setFound({ provider, address });
    } catch (failure) {
      setError(
        isUserRejection(failure)
          ? "You cancelled the connection."
          : "We couldn't reach your Nimiq Pay wallet. Try again.",
      );
    } finally {
      setConnecting(false);
    }
  }, [provider]);

  if (!found) return { state: "detecting" };
  if (!provider) return { state: "outside" };
  if (found.address) {
    return { state: "connected", provider, address: found.address };
  }
  return {
    state: "disconnected",
    provider,
    connecting,
    error,
    connect: () => void connect(),
  };
}
