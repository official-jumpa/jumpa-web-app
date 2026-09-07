import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { TopUpView } from "@/components/savings/top-up-view";
import { getSavingsPlanById } from "@/lib/functions/savingsFunctions";
import { getSession } from "@/lib/session";
import { PROMOTIONS } from "@/lib/wallet";

export const metadata: Metadata = { title: "Top up" };

export default async function TopUpPage({
  params,
}: PageProps<"/savings/individual/[id]/top-up">) {
  const session = await getSession();
  if (!session?.userId) redirect("/onboarding");

  const { id } = await params;
  const plan = await getSavingsPlanById(id, session.userId, "individual");

  if (!plan) notFound();

  return (
    <TopUpView
      plan={plan}
      back={`/savings/individual/${plan.id}`}
      promotions={PROMOTIONS}
    />
  );
}
