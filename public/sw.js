/*
 * Minimal service worker. It exists for two reasons: the installed app has to
 * open without a connection, and a browser that still gates installability on
 * one needs it to fire `beforeinstallprompt`.
 *
 * It is deliberately the smallest thing that does that. This is a wallet, so a
 * cache that serves stale application code or stale money data is worse than no
 * cache at all:
 *
 *   - `/api/*` and `?_rsc=*` are never touched, in either direction.
 *   - Static assets (`/_next/static/*`) are served directly by the browser's
 *     native HTTP disk cache (they are already immutable and content-hashed).
 *   - Only failed navigation requests fall back to `/offline.html`.
 *
 * Bump `VERSION` to retire every cache from the previous build.
 */

const VERSION = "v0.1.1";
const SHELL = `jumpa-shell-${VERSION}`;
const OFFLINE = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL)
      .then((cache) => cache.add(OFFLINE)),
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== SHELL)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Only handle navigation requests for offline fallback.
  // Everything else (Next.js static JS/CSS assets, API routes, RSC chunks)
  // bypasses the service worker and is handled at native browser speed.
  if (request.mode !== "navigate") return;

  event.respondWith(
    fetch(request, { credentials: "include" }).catch(async () => {
      const cached = await caches.match(OFFLINE);
      return (
        cached ||
        new Response("Offline", {
          status: 503,
          headers: { "Content-Type": "text/plain" },
        })
      );
    }),
  );
});
