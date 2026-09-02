import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TopUpView } from "@/components/savings/top-up-view";
import { findPlan } from "@/lib/savings";
import { PROMOTIONS } from "@/lib/wallet";

export const metadata: Metadata = { title: "Top up" };

export default async function TopUpPage({
  params,
}: PageProps<"/savings/lock/[id]/top-up">) {
  const { id } = await params;
  const plan = findPlan("lock", id);

  if (!plan) notFound();

  return (
    <TopUpView
      plan={plan}
      back={`/savings/lock/${plan.id}`}
      promotions={PROMOTIONS}
    />
  );
}
