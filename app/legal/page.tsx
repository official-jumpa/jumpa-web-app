import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LegalIndex } from "@/components/legal/legal-index";
import { LegalScreen } from "@/components/legal/legal-screen";
import { isLegalDoc, LEGAL_DOCUMENTS, legalHref } from "@/lib/legal";
import { pageMetadata } from "@/lib/seo";

interface LegalPageProps {
  searchParams: Promise<{ doc?: string }>;
}

export async function generateMetadata({
  searchParams,
}: LegalPageProps): Promise<Metadata> {
  const { doc } = await searchParams;

  if (doc && isLegalDoc(doc)) {
    const { title, summary } = LEGAL_DOCUMENTS[doc];
    return pageMetadata({
      title,
      description: summary,
      path: legalHref(doc),
    });
  }

  return pageMetadata({
    title: "Legal",
    description: "Jumpa's Terms and Conditions and Privacy Policy.",
    path: legalHref(),
  });
}

/** Both documents on one route, in the `?doc=` shape the rest of the app uses. */
export default async function LegalPage({ searchParams }: LegalPageProps) {
  const { doc } = await searchParams;

  if (!doc) return <LegalIndex />;
  if (isLegalDoc(doc)) return <LegalScreen doc={doc} />;
  notFound();
}
