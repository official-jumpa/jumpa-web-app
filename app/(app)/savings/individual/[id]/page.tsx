import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { PlanDetail } from "@/components/savings/plan-detail";
import { getSavingsPlanById } from "@/lib/functions/savingsFunctions";
import { getSession } from "@/lib/session";

export const metadata: Metadata = { title: "Individual savings" };

export default async function PlanPage({
  params,
}: PageProps<"/savings/individual/[id]">) {
  const session = await getSession();
  if (!session?.userId) redirect("/onboarding");

  const { id } = await params;
  const plan = await getSavingsPlanById(id, session.userId, "individual");

  if (!plan) notFound();

  return (
    <PlanDetail
      plan={plan}
      back="/savings/individual"
      topUpHref={`/savings/individual/${plan.id}/top-up`}
    />
  );
}
