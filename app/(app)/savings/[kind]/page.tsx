import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { CreateCircleView } from "@/components/savings/create-circle-view";
import { CreateTargetView } from "@/components/savings/create-target-view";
import { LockSavingsView } from "@/components/savings/lock-savings-view";
import { PlanDetail } from "@/components/savings/plan-detail";
import { ProductScreen } from "@/components/savings/product-screen";
import { TopUpView } from "@/components/savings/top-up-view";
import { getSavingsPlanById } from "@/lib/functions/savingsFunctions";
import {
  findPlan,
  kindFromSlug,
  plansOf,
  SAVINGS_PRODUCTS,
  savingsHref,
} from "@/lib/savings";
import { getSession } from "@/lib/session";

interface SavingsProductPageProps {
  params: Promise<{ kind: string }>;
  searchParams: Promise<{ id?: string; new?: string; topup?: string }>;
}

const on = (flag?: string) => flag === "1" || flag === "true";

export async function generateMetadata({
  params,
  searchParams,
}: SavingsProductPageProps): Promise<Metadata> {
  const kind = kindFromSlug((await params).kind);
  if (!kind) return {};

  const { topup } = await searchParams;
  const { title } = SAVINGS_PRODUCTS[kind];
  return { title: on(topup) ? "Top up" : title };
}

/**
 * One product, four stages. Create, a plan and its top-up used to be their own
 * nested routes; they are query params now, so the whole product lives at one
 * URL and a plan id never appears in the path.
 */
export default async function SavingsProductPage({
  params,
  searchParams,
}: SavingsProductPageProps) {
  const kind = kindFromSlug((await params).kind);
  if (!kind) notFound();

  const { id, new: create, topup } = await searchParams;

  if (on(create)) {
    if (kind === "lock") return <LockSavingsView />;
    if (kind === "circle") return <CreateCircleView />;
    return <CreateTargetView />;
  }

  if (id) {
    const session = await getSession();
    if (!session?.userId) redirect("/onboarding");

    // Circles has no stored plans yet, so it falls back to the placeholder.
    const plan =
      (await getSavingsPlanById(id, session.userId, kind)) ??
      findPlan(kind, id);
    if (!plan) notFound();

    if (on(topup)) {
      return (
        <TopUpView plan={plan} back={savingsHref(kind, { id: plan.id })} />
      );
    }

    return (
      <PlanDetail
        plan={plan}
        back={savingsHref(kind)}
        topUpHref={savingsHref(kind, { id: plan.id, topUp: true })}
      />
    );
  }

  const product = SAVINGS_PRODUCTS[kind];
  return (
    <ProductScreen
      kind={kind}
      {...product}
      plans={product.seeded ? plansOf(kind) : []}
    />
  );
}
