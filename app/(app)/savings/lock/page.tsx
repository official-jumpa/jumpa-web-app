import type { Metadata } from "next";
import { ProductScreen } from "@/components/savings/product-screen";
import { plansOf } from "@/lib/savings";

export const metadata: Metadata = { title: "Locked savings" };

export default function LockSavingsPage() {
  return (
    <ProductScreen
      kind="lock"
      title="Locked savings"
      cta="Create new"
      newHref="/savings/lock/new"
      listLabel="Recent Plans"
      emptyTitle="No recent plans"
      plans={plansOf("lock")}
    />
  );
}
