/*
 * Minimal service worker. It exists for two reasons: the installed app has to
 * open without a connection, and a browser that still gates installability on
 * one needs it to fire `beforeinstallprompt`.
 *
 * It is deliberately the smallest thing that does that. This is a wallet, so a
 * cache that serves stale application code or stale money data is worse than no
 * cache at all:
 *
 *   - `/api/*` is never touched, in either direction.
 *   - A page load always goes to the network. The cached page is only what a
 *     failed load falls back to, never what a working one gets.
 *   - The only thing cached is Next's build output, which is content-hashed —
 *     a hit on those cannot be stale by construction.
 *
 * Bump `VERSION` to retire every cache from the previous build.
 */

const VERSION = "v1";
const SHELL = `jumpa-shell-${VERSION}`;
const ASSETS = `jumpa-assets-${VERSION}`;
const OFFLINE = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL)
      .then((cache) => cache.add(OFFLINE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== SHELL && key !== ASSETS)
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
  // Balances, sessions and transactions: never cached, never served from cache.
  if (url.pathname.startsWith("/api/")) return;

  // Pages: the network decides. Nobody sees a stale screen or an old build.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => {
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
    return;
  }

  // Build assets carry a content hash in their path, so a hit is always right.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ||
          fetch(request).then((response) => {
            const copy = response.clone();
            caches.open(ASSETS).then((cache) => cache.put(request, copy));
            return response;
          }),
      ),
    );
  }
});
