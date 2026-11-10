import type { NextConfig } from "next";

/**
 * A day fresh, a month of stale-while-revalidate. Files under `public/` are
 * served with `max-age=0` by default, so every screen re-validated its art on
 * each visit; SWR serves them from cache instantly and refreshes in the
 * background. Names are not content-hashed, so a swapped asset takes up to a
 * day to reach a browser that already has it — rename it to publish sooner.
 */
const STATIC_ASSET_CACHE =
  "public, max-age=86400, stale-while-revalidate=2592000";

// Pages built ahead of time get a one-year `s-maxage` by default, and Vercy keeps serving that copy after a deploy. Add new static pages here.
const PRERENDERED_PAGES = [
  "/onboarding",
  "/docs/:path*",
  "/privacy",
  "/terms-of-service",
];

const NO_STORE = "private, no-cache, no-store, max-age=0, must-revalidate";

const nextConfig: NextConfig = {
  images: {
    // Keep an optimised variant on the server for a week instead of the 60s
    // default, so the first visitor pays for the encode and nobody else does.
    minimumCacheTTL: 604800,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "*.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "assets.coingecko.com",
      },
      // Profile photos uploaded through /api/v1/user/avatar.
      {
        protocol: "https",
        hostname: "storage.vercy.fun",
      },
      {
        protocol: "https",
        hostname: "coin-images.coingecko.com",
      },
    ],
  },
  async rewrites() {
    return {
      beforeFiles: [],
      afterFiles: [],
      // TODO: remove once Vercy's cache is purged; pages it cached from older builds link CSS files a later deploy deleted.
      fallback: [
        {
          source: "/_next/static/chunks/:file.css",
          destination: "/cache-fallback/styles.css",
        },
      ],
    };
  },
  async headers() {
    return [
      ...PRERENDERED_PAGES.map((source) => ({
        source,
        headers: [{ key: "Cache-Control", value: NO_STORE }],
      })),
      {
        // Vercy caches GET replies that carry no Cache-Control, for every caller; balances and order status must be live.
        source: "/api/v1/nimiq/:path*",
        headers: [{ key: "Cache-Control", value: NO_STORE }],
      },
      {
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
          },
        ],
      },
      {
        source: "/images/:path*",
        headers: [{ key: "Cache-Control", value: STATIC_ASSET_CACHE }],
      },
      {
        source: "/images/networks/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/coins/:path*",
        headers: [{ key: "Cache-Control", value: STATIC_ASSET_CACHE }],
      },
      {
        source: "/logo/:path*",
        headers: [{ key: "Cache-Control", value: STATIC_ASSET_CACHE }],
      },
      {
        // Not `/assets/:path*`: that also matches the signed-in `/assets` page and lets Vercy share it.
        source: "/assets/chains/:path*",
        headers: [{ key: "Cache-Control", value: STATIC_ASSET_CACHE }],
      },
    ];
  },
};

export default nextConfig;
