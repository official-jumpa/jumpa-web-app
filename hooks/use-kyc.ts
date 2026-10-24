"use client";

import { useCallback, useEffect, useState } from "react";
import { useRefreshSignal } from "@/lib/refresh";

interface KycMemoryCache {
  isCompleted?: boolean;
}

// In-memory module cache (ephemeral to current tab session, zero localStorage)
let kycMemoryCache: KycMemoryCache = {};

export interface UseKycResult {
  isKycComplete: boolean;
  isLoading: boolean;
  isReady: boolean;
  refresh: () => Promise<void>;
}

/**
 * Hook to detect whether the authenticated user has completed identity verification (KYC).
 * Seeded strictly from server props or memory cache, and validated via DB / Redis cache.
 * Completely avoids localStorage.
 */
export function useKyc(initialKycComplete?: boolean): UseKycResult {
  const [isKycComplete, setIsKycComplete] = useState<boolean>(() => {
    if (initialKycComplete !== undefined) {
      kycMemoryCache = { isCompleted: initialKycComplete };
      return initialKycComplete;
    }
    if (typeof kycMemoryCache.isCompleted === "boolean") {
      return kycMemoryCache.isCompleted;
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

  const fetchKycStatus = useCallback(async (isBypassCache = false) => {
    try {
      setIsLoading(true);
      const url = isBypassCache ? "/api/v1/kyc?refresh=true" : "/api/v1/kyc";
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) return;

      const data = await res.json();
      const isDone = Boolean(
        data?.isCompleted ||
          data?.status === "approved" ||
          data?.status === "verified" ||
          data?.stage === "completed",
      );

      setIsKycComplete(isDone);
      kycMemoryCache = { isCompleted: isDone };
    } catch (err) {
      console.warn("[useKyc] Failed to fetch KYC status:", err);
    } finally {
      setIsLoading(false);
      setIsReady(true);
    }
  }, []);

  useEffect(() => {
    // If not already known to be complete, check status
    if (!kycMemoryCache.isCompleted && !initialKycComplete) {
      fetchKycStatus(false);
    } else {
      setIsLoading(false);
      setIsReady(true);
    }
  }, [fetchKycStatus, initialKycComplete]);

  // Pull-to-refresh forcefully re-fetches from DB and refreshes server & client cache
  useRefreshSignal(() => {
    fetchKycStatus(true);
  });

  return {
    isKycComplete,
    isLoading,
    isReady,
    refresh: () => fetchKycStatus(true),
  };
}
