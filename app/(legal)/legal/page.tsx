import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";
import { LegalIndex } from "@/components/legal/legal-index";
import { isLegalDoc, legalHref } from "@/lib/legal";
import { pageMetadata } from "@/lib/seo";

interface LegalPageProps {
  searchParams: Promise<{ doc?: string }>;
}

export const metadata: Metadata = pageMetadata({
  title: "Legal",
  description: "Jumpa's Terms and Conditions and Privacy Policy.",
  path: legalHref(),
});

/**
 * Both documents used to live here as `?doc=`, and that form is indexed — so it
 * is a 308 to the document's own route rather than a 404. Bare `/legal` stays
 * as the index that links to both.
 */
export default async function LegalPage({ searchParams }: LegalPageProps) {
  const { doc } = await searchParams;
  if (doc && isLegalDoc(doc)) permanentRedirect(legalHref(doc));
  return <LegalIndex />;
}
