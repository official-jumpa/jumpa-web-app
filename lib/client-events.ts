"use client";

export const BALANCE_REFRESH_EVENT = "jumpa:refresh-balances";
export const NGN_REFRESH_EVENT = "jumpa:refresh-ngn";

let broadcastChannel: BroadcastChannel | null = null;
if (typeof window !== "undefined" && "BroadcastChannel" in window) {
  try {
    broadcastChannel = new BroadcastChannel("jumpa_balance_channel");
    broadcastChannel.onmessage = (event) => {
      if (event.data === BALANCE_REFRESH_EVENT) {
        window.dispatchEvent(new CustomEvent(BALANCE_REFRESH_EVENT));
      } else if (event.data === NGN_REFRESH_EVENT) {
        window.dispatchEvent(new CustomEvent(NGN_REFRESH_EVENT));
      }
    };
  } catch {
    // Ignore restricted BroadcastChannel environments
  }
}

export interface InvalidateClientBalancesOptions {
  ngnOnly?: boolean;
  cryptoOnly?: boolean;
}

/**
 * Purges cached balances in localStorage and broadcasts refresh events to all
 * active components and browser tabs/windows immediately.
 */
export function invalidateClientBalances(options: InvalidateClientBalancesOptions = {}) {
  if (typeof window === "undefined") return;

  try {
    if (!options.cryptoOnly) {
      localStorage.removeItem("jumpa_ngn_account_cache");
    }
    if (!options.ngnOnly) {
      localStorage.removeItem("jumpa_last_balance");
      localStorage.removeItem("jumpa_last_assets");
    }
  } catch {}

  // Dispatch local window events
  if (!options.cryptoOnly) {
    window.dispatchEvent(new CustomEvent(NGN_REFRESH_EVENT));
    try {
      broadcastChannel?.postMessage(NGN_REFRESH_EVENT);
    } catch {}
  }

  if (!options.ngnOnly) {
    window.dispatchEvent(new CustomEvent(BALANCE_REFRESH_EVENT));
    try {
      broadcastChannel?.postMessage(BALANCE_REFRESH_EVENT);
    } catch {}
  }
}

/**
 * Subscribes to global balance refresh events. Returns an unsubscribe cleanup function.
 */
export function onBalanceRefresh(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(BALANCE_REFRESH_EVENT, callback);
  return () => {
    window.removeEventListener(BALANCE_REFRESH_EVENT, callback);
  };
}

/**
 * Subscribes to global NGN account & balance refresh events. Returns an unsubscribe cleanup function.
 */
export function onNgnRefresh(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(NGN_REFRESH_EVENT, callback);
  return () => {
    window.removeEventListener(NGN_REFRESH_EVENT, callback);
  };
}
