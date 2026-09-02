import type { Metadata } from "next";
import { ProductScreen } from "@/components/savings/product-screen";
import { plansOf } from "@/lib/savings";

export const metadata: Metadata = { title: "Circles" };

export default function CirclesPage() {
  return (
    <ProductScreen
      kind="circle"
      title="Circles"
      cta="Create new circle"
      newHref="/savings/circles/new"
      listLabel="Recent Plans"
      emptyTitle="No recent plans"
      plans={plansOf("circle")}
    />
  );
}
