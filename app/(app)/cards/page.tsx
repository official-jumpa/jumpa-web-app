import type { Metadata } from "next";
import { CardIntro } from "@/components/cards/card-intro";
import { CardLimitsView } from "@/components/cards/card-limits-view";
import { CardsView } from "@/components/cards/cards-view";
import { CreateCardView } from "@/components/cards/create-card-view";
import { CARD_TIER, CARDS, USAGE_LIMITS } from "@/lib/cards";
import { PROMOTIONS } from "@/lib/wallet";

interface CardsPageProps {
  searchParams: Promise<{ view?: string }>;
}

const TITLES: Record<string, string> = {
  new: "Create new card",
  create: "Create your card",
  limits: "Card Limits",
};

export async function generateMetadata({
  searchParams,
}: CardsPageProps): Promise<Metadata> {
  const { view } = await searchParams;
  return { title: (view && TITLES[view]) || "Cards" };
}

/**
 * Cards and the three screens that hang off it. They were nested routes —
 * `/cards/new/type` three levels down — and are a `?view=` on this one now.
 */
export default async function CardsPage({ searchParams }: CardsPageProps) {
  const { view } = await searchParams;

  if (view === "limits") {
    return <CardLimitsView tier={CARD_TIER} limits={USAGE_LIMITS} />;
  }
  if (view === "create") return <CreateCardView />;
  if (view === "new") return <CardIntro back="/cards" />;

  if (CARDS.length === 0) return <CardIntro back="/home" />;
  return <CardsView cards={CARDS} promotions={PROMOTIONS} />;
}
