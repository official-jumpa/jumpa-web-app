"use client";

import { useEffect, useRef } from "react";

/** Calls `tick` when the app comes back into view, and every `everyMs` while it stays visible. */
export function useLiveRefresh(
  active: boolean,
  tick: () => void,
  everyMs = 10_000,
) {
  const latest = useRef(tick);
  useEffect(() => {
    latest.current = tick;
  });

  useEffect(() => {
    if (!active) return;
    const run = () => {
      if (document.visibilityState === "visible") latest.current();
    };
    const timer = setInterval(run, everyMs);
    document.addEventListener("visibilitychange", run);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", run);
    };
  }, [active, everyMs]);
}
