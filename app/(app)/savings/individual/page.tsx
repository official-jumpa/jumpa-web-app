import type { Metadata } from "next";
import { ProductScreen } from "@/components/savings/product-screen";

export const metadata: Metadata = { title: "Individual savings" };

export default function IndividualSavingsPage() {
  return (
    <ProductScreen
      kind="individual"
      title="Individual savings"
      cta="Create new"
      newHref="/savings/individual/new"
      listLabel="Recent savings"
      emptyTitle="No savings plans yet"
      emptyCaption="Create a savings target to start earning"
      plans={[]}
    />
  );
}
