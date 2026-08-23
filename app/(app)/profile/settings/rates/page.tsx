import type { Metadata } from "next";
import { ComingSoon } from "@/components/ui/coming-soon";

export const metadata: Metadata = { title: "Currency Rates" };

export default function CurrencyRatesPage() {
  return <ComingSoon feature="Currency Rates" />;
}
