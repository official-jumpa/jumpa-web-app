import type { Metadata } from "next";
import { ComingSoon } from "@/components/ui/coming-soon";

export const metadata: Metadata = { title: "Airtime" };

export default function AirtimePage() {
  return <ComingSoon feature="Airtime" />;
}
