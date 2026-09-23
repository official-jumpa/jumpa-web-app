"use client";

import { useEffect, useState, useCallback } from "react";

const NGN_CACHE_KEY = "jumpa_ngn_account_cache";

interface NgnMemoryCache {
  hasAccount?: boolean;
  balance?: string | null;
  rawBalance?: number;
}

let ngnMemoryCache: NgnMemoryCache = {};

function readNgnCache(): NgnMemoryCache {
  if (typeof window === "undefined") return {};
  try {
    const cached = localStorage.getItem(NGN_CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed && typeof parsed.hasAccount === "boolean") {
        return parsed;
      }
    }
  } catch {}
  return {};
}

export interface UseNgnAccountResult {
  hasNgnAccount: boolean;
  isLoading: boolean;
  isReady: boolean;
  ngnBalance: string | null;
  rawBalance: number;
  refresh: () => Promise<void>;
}

/**
 * Hook to detect whether the authenticated user has an active Naira virtual account,
 * along with their formatted and raw balance.
 * Seeded from localStorage/memory cache for zero-flicker UI, and updated via /api/ngn-account.
 */
export function useNgnAccount(initialHasAccount?: boolean): UseNgnAccountResult {
  const [hasNgnAccount, setHasNgnAccount] = useState<boolean>(() => {
    if (initialHasAccount !== undefined) return initialHasAccount;
    if (typeof ngnMemoryCache.hasAccount === "boolean") return ngnMemoryCache.hasAccount;
    const fromStorage = readNgnCache();
    if (typeof fromStorage.hasAccount === "boolean") {
      ngnMemoryCache = fromStorage;
      return fromStorage.hasAccount;
    }
    return false;
  });

  const [ngnBalance, setNgnBalance] = useState<string | null>(() => {
    return ngnMemoryCache.balance ?? null;
  });

  const [rawBalance, setRawBalance] = useState<number>(() => {
    return ngnMemoryCache.rawBalance ?? 0;
  });

  const [isLoading, setIsLoading] = useState<boolean>(() => {
    return ngnMemoryCache.hasAccount === undefined && initialHasAccount === undefined;
  });

  const [isReady, setIsReady] = useState<boolean>(() => {
    return ngnMemoryCache.hasAccount !== undefined || initialHasAccount !== undefined;
  });

  const fetchNgnAccount = useCallback(async () => {
    try {
      const res = await fetch("/api/ngn-account", { cache: "no-store" });
      if (!res.ok) {
        if (res.status === 404) {
          setHasNgnAccount(false);
          setNgnBalance(null);
          setRawBalance(0);
          ngnMemoryCache = { hasAccount: false, balance: null, rawBalance: 0 };
          try {
            localStorage.setItem(NGN_CACHE_KEY, JSON.stringify(ngnMemoryCache));
          } catch {}
        }
        return;
      }

      const data = await res.json();
      if (data.hasAccount) {
        const numBal = Number(data.balance?.availableBalance ?? 0);
        const formatted = `₦${numBal.toLocaleString("en-NG", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`;
        setHasNgnAccount(true);
        setNgnBalance(formatted);
        setRawBalance(numBal);
        ngnMemoryCache = { hasAccount: true, balance: formatted, rawBalance: numBal };
        try {
          localStorage.setItem(
            NGN_CACHE_KEY,
            JSON.stringify(ngnMemoryCache),
          );
        } catch {}
      } else {
        setHasNgnAccount(false);
        setNgnBalance(null);
        setRawBalance(0);
        ngnMemoryCache = { hasAccount: false, balance: null, rawBalance: 0 };
        try {
          localStorage.setItem(
            NGN_CACHE_KEY,
            JSON.stringify(ngnMemoryCache),
          );
        } catch {}
      }
    } catch (err) {
      console.warn("[useNgnAccount] Failed to fetch NGN account status:", err);
    } finally {
      setIsLoading(false);
      setIsReady(true);
    }
  }, []);

  useEffect(() => {
    fetchNgnAccount();
  }, [fetchNgnAccount]);

  return {
    hasNgnAccount,
    isLoading,
    isReady,
    ngnBalance,
    rawBalance,
    refresh: fetchNgnAccount,
  };
}
