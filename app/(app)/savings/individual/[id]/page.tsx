import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PlanDetail } from "@/components/savings/plan-detail";
import { findPlan } from "@/lib/savings";

export const metadata: Metadata = { title: "Individual savings" };

export default async function PlanPage({
  params,
}: PageProps<"/savings/individual/[id]">) {
  const { id } = await params;
  const plan = findPlan("individual", id);

  if (!plan) notFound();

  return (
    <PlanDetail
      plan={plan}
      back="/savings/individual"
      topUpHref={`/savings/individual/${plan.id}/top-up`}
    />
  );
}
