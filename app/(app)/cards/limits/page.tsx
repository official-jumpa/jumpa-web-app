import type { Metadata } from "next";
import { CardLimitsView } from "@/components/cards/card-limits-view";
import { CARD_TIER, USAGE_LIMITS } from "@/lib/cards";

export const metadata: Metadata = { title: "Card Limits" };

export default function CardLimitsPage() {
  return <CardLimitsView tier={CARD_TIER} limits={USAGE_LIMITS} />;
}
