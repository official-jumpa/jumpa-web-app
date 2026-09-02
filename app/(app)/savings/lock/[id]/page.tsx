import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PlanDetail } from "@/components/savings/plan-detail";
import { findPlan } from "@/lib/savings";

export const metadata: Metadata = { title: "Locked savings" };

export default async function PlanPage({
  params,
}: PageProps<"/savings/lock/[id]">) {
  const { id } = await params;
  const plan = findPlan("lock", id);

  if (!plan) notFound();

  return (
    <PlanDetail
      plan={plan}
      back="/savings/lock"
      topUpHref={`/savings/lock/${plan.id}/top-up`}
    />
  );
}
