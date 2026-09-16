"use client";

import { useEffect } from "react";

/**
 * Registers `public/sw.js`, which is what lets the installed app open with no
 * connection. Renders nothing.
 *
 * **Development is excluded on purpose.** A service worker caches Turbopack's
 * chunks and then serves them back over HMR, so an edit appears not to take —
 * the worst kind of bug to chase, because the code on disk is already correct.
 */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // An unregistrable worker costs nothing — the app is online-only again.
    });
  }, []);

  return null;
}
