import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PlanDetail } from "@/components/savings/plan-detail";
import { findPlan } from "@/lib/savings";

export const metadata: Metadata = { title: "Circles" };

export default async function PlanPage({
  params,
}: PageProps<"/savings/circles/[id]">) {
  const { id } = await params;
  const plan = findPlan("circle", id);

  if (!plan) notFound();

  return (
    <PlanDetail
      plan={plan}
      back="/savings/circles"
      topUpHref={`/savings/circles/${plan.id}/top-up`}
    />
  );
}
