import type { Metadata } from "next";
import { CardIntro } from "@/components/cards/card-intro";
import { CardsView } from "@/components/cards/cards-view";
import { CARDS } from "@/lib/cards";
import { PROMOTIONS } from "@/lib/wallet";

export const metadata: Metadata = { title: "Cards" };

export default function CardsPage() {
  if (CARDS.length === 0) return <CardIntro back="/home" />;

  return <CardsView cards={CARDS} promotions={PROMOTIONS} />;
}
