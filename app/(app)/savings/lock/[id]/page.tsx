import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { PlanDetail } from "@/components/savings/plan-detail";
import { getSavingsPlanById } from "@/lib/functions/savingsFunctions";
import { getSession } from "@/lib/session";

export const metadata: Metadata = { title: "Locked savings" };

export default async function PlanPage({
  params,
}: PageProps<"/savings/lock/[id]">) {
  const session = await getSession();
  if (!session?.userId) redirect("/onboarding");

  const { id } = await params;
  const plan = await getSavingsPlanById(id, session.userId, "lock");

  if (!plan) notFound();

  return (
    <PlanDetail
      plan={plan}
      back="/savings/lock"
      topUpHref={`/savings/lock/${plan.id}/top-up`}
    />
  );
}
