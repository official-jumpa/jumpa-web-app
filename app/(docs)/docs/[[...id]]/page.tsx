import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DocsView } from "@/components/docs/docs-view";
import { getAllDocSlugs, getDocPage } from "@/lib/docs/content";
import { pageMetadata } from "@/lib/seo";

interface PageProps {
  params: Promise<{
    id?: string[];
  }>;
}

export async function generateStaticParams() {
  const ids = getAllDocSlugs();
  return [
    { id: [] }, // /docs
    ...ids.map((entry) => ({ id: [entry] })), // /docs/[id]
  ];
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const currentId = id && id.length > 0 ? id[id.length - 1] : "overview";
  const doc = getDocPage(currentId);

  if (!doc) {
    return pageMetadata({
      title: "Docs Not Found",
      description: "Documentation page could not be found.",
      path: "/docs",
      noIndex: true,
    });
  }

  return pageMetadata({
    title: `${doc.title}`,
    description: doc.description,
    path: `/docs/${doc.id}`,
  });
}

export default async function DocPage({ params }: PageProps) {
  const { id } = await params;
  const currentId = id && id.length > 0 ? id[id.length - 1] : "overview";
  const doc = getDocPage(currentId);

  if (!doc) {
    notFound();
  }

  return <DocsView page={doc} />;
}
