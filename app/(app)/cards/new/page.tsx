import type { Metadata } from "next";
import { CardIntro } from "@/components/cards/card-intro";

export const metadata: Metadata = { title: "Create new card" };

export default function NewCardPage() {
  return <CardIntro back="/cards" />;
}
