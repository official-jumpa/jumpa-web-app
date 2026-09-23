import { FOOTER } from "@/lib/landing";
import { SITE } from "@/lib/seo";
import { SUPPORT_EMAIL } from "@/lib/support";

const ORG_ID = `${SITE}/#organization`;
const SITE_ID = `${SITE}/#website`;

/**
 * Profile URLs for `sameAs`. Bare-domain entries are dropped — `FOOTER.socials`
 * still has `https://linkedin.com` as a placeholder. A rule, not a name, so it
 * stops applying once the real URL lands.
 */
const profiles = FOOTER.socials
  .map((social) => social.href)
  .filter((href) => new URL(href).pathname.length > 1);

const DESCRIPTION =
  "Jumpa is a self-custodial wallet you operate by chatting. Send and receive money, move between cash and crypto, swap and bridge tokens across chains, and save toward goals — by text or voice, in one conversation.";

/**
 * Site-level schema.org graph. "Jumpa" is also an everyday Malay word, so the
 * brand query needs more evidence than the name on the page.
 */
export function siteGraph() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": ORG_ID,
        name: "Jumpa",
        url: SITE,
        description: DESCRIPTION,
        logo: {
          "@type": "ImageObject",
          url: `${SITE}/icons/icon-512.png`,
          width: 512,
          height: 512,
        },
        sameAs: profiles,
        contactPoint: {
          "@type": "ContactPoint",
          contactType: "customer support",
          email: SUPPORT_EMAIL,
          availableLanguage: "English",
        },
      },
      {
        "@type": "WebSite",
        "@id": SITE_ID,
        url: SITE,
        name: "Jumpa",
        description: DESCRIPTION,
        publisher: { "@id": ORG_ID },
        inLanguage: "en",
      },
      {
        "@type": "SoftwareApplication",
        name: "Jumpa",
        applicationCategory: "FinanceApplication",
        // Installable from the browser; there is no store listing to point at.
        operatingSystem: "Web, iOS, Android",
        url: SITE,
        description: DESCRIPTION,
        publisher: { "@id": ORG_ID },
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      },
    ],
  };
}
