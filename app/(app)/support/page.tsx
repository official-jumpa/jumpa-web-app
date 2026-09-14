import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FaqScreen } from "@/components/support/faq-screen";
import { SupportChat } from "@/components/support/support-chat";
import { SupportIndex } from "@/components/support/support-index";

interface SupportPageProps {
  searchParams: Promise<{ view?: string }>;
}

const TITLES: Record<string, string> = {
  chat: "Jumpa Support",
  faqs: "Jumpa FAQs",
};

export async function generateMetadata({
  searchParams,
}: SupportPageProps): Promise<Metadata> {
  const { view } = await searchParams;
  return { title: (view && TITLES[view]) || "Help & Support" };
}

/** Help & Support: the chooser, the live chat and the FAQs on one route. */
export default async function SupportPage({ searchParams }: SupportPageProps) {
  const { view } = await searchParams;

  if (!view) return <SupportIndex />;
  if (view === "chat") return <SupportChat />;
  if (view === "faqs") return <FaqScreen />;
  notFound();
}
