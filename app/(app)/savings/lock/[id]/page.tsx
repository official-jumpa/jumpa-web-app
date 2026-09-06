import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PlanDetail } from "@/components/savings/plan-detail";
import { getPlanById } from "@/lib/savings-service";

export const metadata: Metadata = { title: "Locked savings" };

export default async function PlanPage({
  params,
}: PageProps<"/savings/lock/[id]">) {
  const { id } = await params;
  const plan = await getPlanById(id, "lock");

  if (!plan) notFound();

  return (
    <PlanDetail
      plan={plan}
      back="/savings/lock"
      topUpHref={`/savings/lock/${plan.id}/top-up`}
    />
  );
}
