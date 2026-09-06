import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TopUpView } from "@/components/savings/top-up-view";
import { getPlanById } from "@/lib/savings-service";
import { PROMOTIONS } from "@/lib/wallet";

export const metadata: Metadata = { title: "Top up" };

export default async function TopUpPage({
  params,
}: PageProps<"/savings/individual/[id]/top-up">) {
  const { id } = await params;
  const plan = await getPlanById(id, "individual");

  if (!plan) notFound();

  return (
    <TopUpView
      plan={plan}
      back={`/savings/individual/${plan.id}`}
      promotions={PROMOTIONS}
    />
  );
}
