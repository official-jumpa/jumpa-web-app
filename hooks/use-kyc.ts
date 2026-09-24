"use client";

import { useCallback, useEffect, useState } from "react";
import { useRefreshSignal } from "@/lib/refresh";

const KYC_CACHE_KEY = "jumpa_kyc_completed";

interface KycMemoryCache {
  isCompleted?: boolean;
}

let kycMemoryCache: KycMemoryCache = {};

function readKycCache(): KycMemoryCache {
  if (typeof window === "undefined") return {};
  try {
    const cached = localStorage.getItem(KYC_CACHE_KEY);
    if (cached !== null) {
      return { isCompleted: cached === "true" };
    }
  } catch {}
  return {};
}

export interface UseKycResult {
  isKycComplete: boolean;
  isLoading: boolean;
  isReady: boolean;
  refresh: () => Promise<void>;
}

/**
 * Hook to detect whether the authenticated user has completed identity verification (KYC).
 * Seeded from localStorage/memory cache for zero-flicker UI, and updated via /api/kyc.
 */
export function useKyc(initialKycComplete?: boolean): UseKycResult {
  const [isKycComplete, setIsKycComplete] = useState<boolean>(() => {
    if (initialKycComplete !== undefined) return initialKycComplete;
    if (typeof kycMemoryCache.isCompleted === "boolean") {
      return kycMemoryCache.isCompleted;
    }
    const fromStorage = readKycCache();
    if (typeof fromStorage.isCompleted === "boolean") {
      kycMemoryCache = fromStorage;
      return fromStorage.isCompleted;
    }
    return false;
  });

  const [isLoading, setIsLoading] = useState<boolean>(() => {
    return (
      kycMemoryCache.isCompleted === undefined &&
      initialKycComplete === undefined
    );
  });

  const [isReady, setIsReady] = useState<boolean>(() => {
    return (
      kycMemoryCache.isCompleted !== undefined ||
      initialKycComplete !== undefined
    );
  });

  const fetchKycStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/kyc", { cache: "no-store" });
      if (!res.ok) return;

      const data = await res.json();
      const isDone = Boolean(
        data?.isCompleted ||
          data?.status === "approved" ||
          data?.stage === "completed",
      );

      setIsKycComplete(isDone);
      kycMemoryCache = { isCompleted: isDone };
      try {
        localStorage.setItem(KYC_CACHE_KEY, String(isDone));
      } catch {}
    } catch (err) {
      console.warn("[useKyc] Failed to fetch KYC status:", err);
    } finally {
      setIsLoading(false);
      setIsReady(true);
    }
  }, []);

  useEffect(() => {
    fetchKycStatus();
  }, [fetchKycStatus]);

  // A pull-to-refresh re-runs the server tree, which this hook never sees.
  useRefreshSignal(fetchKycStatus);

  return {
    isKycComplete,
    isLoading,
    isReady,
    refresh: fetchKycStatus,
  };
}
