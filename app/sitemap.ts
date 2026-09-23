import type { MetadataRoute } from "next";
import { legalHref } from "@/lib/legal";
import { SITE } from "@/lib/seo";

const BUILT = new Date();

/** `/sign-in` and `/sign-up` are `noindex` now, so they are out rather than demoted. */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE, lastModified: BUILT, changeFrequency: "weekly", priority: 1 },
    {
      url: `${SITE}/onboarding`,
      lastModified: BUILT,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${SITE}${legalHref("terms")}`,
      lastModified: BUILT,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${SITE}${legalHref("privacy")}`,
      lastModified: BUILT,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}
