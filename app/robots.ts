import type { MetadataRoute } from "next";
import { SITE } from "@/lib/seo";

/**
 * Routes behind the proxy's session check — Googlebot only ever gets a 302.
 * `/assets` is left out because `public/assets/` is served at the same path.
 * Auth screens are left out too: they carry `noindex`, and a blocked URL is
 * never fetched, so Google would never read it.
 */
const PRIVATE_ROUTES = [
  "/home",
  "/cards",
  "/transactions",
  "/send",
  "/receive",
  "/swap",
  "/savings",
  "/profile",
  "/invest",
  "/more",
  "/airtime",
  "/data",
  "/kyc",
  "/ngn-account",
  "/usd-account",
  "/referrals",
  "/support",
  "/notifications",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", ...PRIVATE_ROUTES],
      },
    ],
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}
