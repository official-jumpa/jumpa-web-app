"use client";

import { useEffect, useRef } from "react";

/**
 * Broadcast when a pull-to-refresh lands. `router.refresh()` re-runs the server
 * tree, but a hook that fetches on mount never hears about it — this is how
 * those re-fetch.
 */
export const REFRESH_EVENT = "jumpa:refresh";

export function broadcastRefresh() {
  window.dispatchEvent(new Event(REFRESH_EVENT));
}

/** Re-runs `onRefresh` on every pull-to-refresh, without re-subscribing. */
export function useRefreshSignal(onRefresh: () => void) {
  const latest = useRef(onRefresh);

  useEffect(() => {
    latest.current = onRefresh;
  });

  useEffect(() => {
    const run = () => latest.current();
    window.addEventListener(REFRESH_EVENT, run);
    return () => window.removeEventListener(REFRESH_EVENT, run);
  }, []);
}
