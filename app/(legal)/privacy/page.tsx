import type { Metadata } from "next";
import { LegalScreen } from "@/components/legal/legal-screen";
import { LEGAL_DOCUMENTS, legalHref } from "@/lib/legal";
import { pageMetadata } from "@/lib/seo";

const DOC = LEGAL_DOCUMENTS.privacy;

export const metadata: Metadata = pageMetadata({
  title: DOC.title,
  description: DOC.summary,
  path: legalHref("privacy"),
});

export default function PrivacyPage() {
  return <LegalScreen doc="privacy" />;
}
