import type { Metadata } from "next";
import { CreateCardView } from "@/components/cards/create-card-view";

export const metadata: Metadata = { title: "Create your card" };

export default function CreateCardPage() {
  return <CreateCardView />;
}
