import type { MetadataRoute } from "next";
import { legalHref } from "@/lib/legal";
import { SITE } from "@/lib/seo";

const BUILT = new Date();

/** Public marketing, auth entry points, onboarding, and legal pages. */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE, lastModified: BUILT, changeFrequency: "weekly", priority: 1 },
    {
      url: `${SITE}/sign-up`,
      lastModified: BUILT,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${SITE}/sign-in`,
      lastModified: BUILT,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${SITE}/onboarding`,
      lastModified: BUILT,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${SITE}${legalHref()}`,
      lastModified: BUILT,
      changeFrequency: "monthly",
      priority: 0.4,
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
