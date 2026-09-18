import type { Metadata } from "next";
import { CardIntro } from "@/components/cards/card-intro";
import { CardLimitsView } from "@/components/cards/card-limits-view";
import { CardsView } from "@/components/cards/cards-view";
import { CreateCardView } from "@/components/cards/create-card-view";
import { FundCardView } from "@/components/cards/fund-card-view";
import {
  CARD_TIER,
  CARDS,
  FUNDING_ACCOUNTS,
  USAGE_LIMITS,
} from "@/lib/cards";
import { PROMOTIONS } from "@/lib/wallet";

interface CardsPageProps {
  searchParams: Promise<{ view?: string; account?: string }>;
}

const TITLES: Record<string, string> = {
  new: "Create new card",
  fund: "Fund your card",
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
  const { view, account } = await searchParams;

  if (view === "limits") {
    return <CardLimitsView tier={CARD_TIER} limits={USAGE_LIMITS} />;
  }
  if (view === "create") return <CreateCardView />;
  if (view === "fund" && CARDS.length > 0) {
    const from =
      FUNDING_ACCOUNTS.find((entry) => entry.id === account) ??
      FUNDING_ACCOUNTS[0];
    return <FundCardView card={CARDS[0]} account={from} />;
  }
  if (view === "new") return <CardIntro back="/cards" />;

  // The bare route is the tab, so BottomNav is over this one.
  if (CARDS.length === 0) return <CardIntro back="/home" withNav />;
  return <CardsView cards={CARDS} promotions={PROMOTIONS} />;
}
