import type { Metadata } from "next";

const SITE = "https://usejumpa.com";

const OG_IMAGE = {
  url: "https://usejumpa.com/icons/icon-512.png",
  width: 512,
  height: 512,
  alt: "Jumpa - Move Money the way you Chat",
};

interface PageSeo {
  /** Document title. The root layout's `%s | Jumpa` template applies to it. */
  title: string;
  /** This page's own description. Never reuse another page's. */
  description: string;
  /** Absolute path, for the canonical and og:url. Root's canonical is the homepage. */
  path?: string;
}

/**
 * Per-page metadata.
 *
 * Next merges metadata shallowly, so a page that sets only `description`
 * inherits the root layout's whole `openGraph` block — title and description
 * included. Scrapers (Telegram, WhatsApp, Slack, X) read `og:*`, which is why
 * every link preview showed the homepage copy. Emitting openGraph and twitter
 * here is what makes a page's own description reach them.
 *
 * `absolute` on the og/twitter titles skips the parent's title template, so
 * the suffix is applied once and only once.
 */
export function pageMetadata({ title, description, path }: PageSeo): Metadata {
  const fullTitle = `${title} | Jumpa`;
  const url = path ? `${SITE}${path}` : SITE;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: { absolute: fullTitle },
      description,
      url,
      siteName: "Jumpa",
      images: [OG_IMAGE],
      locale: "en_US",
      type: "website",
    },
    twitter: {
      card: "summary",
      title: { absolute: fullTitle },
      description,
      images: [OG_IMAGE.url],
    },
  };
}
