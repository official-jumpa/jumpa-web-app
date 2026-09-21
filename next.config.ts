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
      {
        protocol: "https",
        hostname: "coin-images.coingecko.com",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/images/:path*",
        headers: [{ key: "Cache-Control", value: STATIC_ASSET_CACHE }],
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
        source: "/assets/:path*",
        headers: [{ key: "Cache-Control", value: STATIC_ASSET_CACHE }],
      },
    ];
  },
};

export default nextConfig;
