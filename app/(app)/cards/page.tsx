import type { Metadata } from "next";
import { CardsView } from "@/components/cards/cards-view";
import { EmptyCards } from "@/components/cards/empty-cards";
import { CARDS } from "@/lib/cards";
import { PROMOTIONS } from "@/lib/wallet";

export const metadata: Metadata = { title: "Cards" };

export default function CardsPage() {
  if (CARDS.length === 0) return <EmptyCards />;

  return <CardsView cards={CARDS} promotions={PROMOTIONS} />;
}
