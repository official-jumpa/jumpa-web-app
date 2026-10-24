"use client";

import { useEffect, useState } from "react";

/**
 * Registers `public/sw.js` and handles PWA lifecycle & update prompts.
 *
 * - Prompts installed PWA users when a service worker is waiting.
 * - Triggers `registration.update()` whenever the app returns to the foreground (`visibilitychange` / `focus`).
 * - Periodically checks for updates every 30 minutes.
 * - Communicates with the service worker via `SKIP_WAITING` on user confirmation.
 *
 * Development is excluded on purpose to avoid interference with Turbopack / HMR.
 */
export function ServiceWorker() {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    const isInstalledPwa =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;

    let registration: ServiceWorkerRegistration | null = null;

    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        registration = reg;

        // If a worker is already waiting in the background
        if (reg.waiting && isInstalledPwa) {
          setWaitingWorker(reg.waiting);
        }

        // Listen for newly installed workers
        reg.addEventListener("updatefound", () => {
          const newWorker = reg.installing;
          if (!newWorker) return;

          newWorker.addEventListener("statechange", () => {
            if (
              isInstalledPwa &&
              newWorker.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              setWaitingWorker(newWorker);
            }
          });
        });
      })
      .catch(() => {
        // An unregistrable worker costs nothing — the app is online-only.
      });

    // When the waiting worker activates and claims clients, reload smoothly
    let refreshing = false;
    const handleControllerChange = () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    };

    navigator.serviceWorker.addEventListener(
      "controllerchange",
      handleControllerChange,
    );

    // Check for updates when returning to the app from background or switching tabs
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === "visible" && registration) {
        registration.update().catch(() => {});
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityOrFocus);
    window.addEventListener("focus", handleVisibilityOrFocus);

    // Periodic background update check every 30 minutes
    const interval = setInterval(() => {
      if (registration) {
        registration.update().catch(() => {});
      }
    }, 30 * 60 * 1000);

    return () => {
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        handleControllerChange,
      );
      document.removeEventListener("visibilitychange", handleVisibilityOrFocus);
      window.removeEventListener("focus", handleVisibilityOrFocus);
      clearInterval(interval);
    };
  }, []);

  if (!waitingWorker) return null;

  return (
    <div
      role="alert"
      className="fixed bottom-6 left-4 right-4 z-[9999] mx-auto max-w-sm rounded-2xl bg-[#161616] p-3.5 text-white shadow-2xl border border-white/10 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-4 duration-300"
      style={{
        boxShadow: "0 10px 30px -5px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1)",
      }}
    >
      <div className="flex flex-col min-w-0 pr-1">
        <span className="text-xs font-semibold text-white tracking-tight">
          Update Available
        </span>
        <span className="text-[11px] text-white/60 truncate">
          A new version of Jumpa is ready.
        </span>
      </div>
      <button
        type="button"
        onClick={() => {
          waitingWorker.postMessage({ type: "SKIP_WAITING" });
        }}
        className="shrink-0 rounded-full bg-[#8f12ff] px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-[#800ee6] active:scale-95"
      >
        Update Now
      </button>
    </div>
  );
}
