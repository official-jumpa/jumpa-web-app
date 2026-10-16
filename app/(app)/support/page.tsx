import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FaqScreen } from "@/components/support/faq-screen";
import { SupportIndex } from "@/components/support/support-index";
import { SupportMessages } from "@/components/support/support-messages";
import { SupportThread } from "@/components/support/thread/support-thread";

interface SupportPageProps {
  searchParams: Promise<{ view?: string; t?: string; tx?: string }>;
}

const TITLES: Record<string, string> = {
  chat: "Jumpa Support",
  faqs: "Jumpa FAQs",
  messages: "Support messages",
};

export async function generateMetadata({
  searchParams,
}: SupportPageProps): Promise<Metadata> {
  const { view } = await searchParams;
  return { title: (view && TITLES[view]) || "Help & Support" };
}

/** Help & Support: the chooser, a conversation, the list of them and the FAQs on one route. */
export default async function SupportPage({ searchParams }: SupportPageProps) {
  const { view, t, tx } = await searchParams;

  if (!view) return <SupportIndex />;
  if (view === "chat") {
    // Keyed so moving between conversations starts each one fresh.
    return (
      <SupportThread
        key={t ?? `new-${tx ?? ""}`}
        ticketId={t ?? null}
        transactionId={tx ?? null}
      />
    );
  }
  if (view === "messages") return <SupportMessages />;
  if (view === "faqs") return <FaqScreen />;
  notFound();
}
