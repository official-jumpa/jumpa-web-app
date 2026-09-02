import type { Metadata } from "next";
import { ProductScreen } from "@/components/savings/product-screen";
import { plansOf } from "@/lib/savings";

export const metadata: Metadata = { title: "Individual savings" };

export default function IndividualSavingsPage() {
  return (
    <ProductScreen
      kind="individual"
      title="Individual savings"
      cta="Create new"
      newHref="/savings/individual/new"
      listLabel="Recent savings"
      emptyTitle="No recent accounts"
      emptyCaption="Stellar, Solana, Base"
      plans={plansOf("individual")}
    />
  );
}
