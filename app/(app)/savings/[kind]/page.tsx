import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { CreateCircleView } from "@/components/savings/create-circle-view";
import { CreateTargetView } from "@/components/savings/create-target-view";
import { LockSavingsView } from "@/components/savings/lock-savings-view";
import { PlanDetail } from "@/components/savings/plan-detail";
import { ProductScreen } from "@/components/savings/product-screen";
import { TopUpView } from "@/components/savings/top-up-view";
import {
  getSavingsPlanById,
  listSavingsPlansByUserId,
} from "@/lib/functions/savingsFunctions";
import { formatPlanForUI } from "@/lib/savings-service";
import {
  findPlan,
  kindFromSlug,
  plansOf,
  SAVINGS_PRODUCTS,
  SAVINGS_BALANCE,
  savingsHref,
} from "@/lib/savings";
import { getCachedAuthSession } from "@/lib/functions/permissionFunctions";

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
    const session = await getCachedAuthSession();
    if (!session?.user?.id) redirect("/onboarding");

    // Circles has no stored plans yet, so it falls back to the placeholder.
    const plan =
      (await getSavingsPlanById(id, session.user.id, kind)) ??
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
  let hydratedPlans: any[] = product.seeded ? plansOf(kind) : [];
  let initialBalance: any = undefined;

  try {
    const session = await getCachedAuthSession();
    if (session?.user?.id) {
      const rawPlans = await listSavingsPlansByUserId(session.user.id, kind);
      if (rawPlans.length > 0) {
        let totalSaved = 0;
        hydratedPlans = rawPlans.map((p) => {
          if (p.status === "Active") {
            totalSaved += p.currentAmount || 0;
          }
          return formatPlanForUI(p);
        });
        const defaultBal = SAVINGS_BALANCE[kind];
        initialBalance = {
          badge: defaultBal.badge,
          amount: `$${totalSaved.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          rate: "rate" in defaultBal ? (defaultBal as any).rate : undefined,
        };
      }
    }
  } catch (err) {
    console.warn("[SavingsProductPage SSR] Prefetch fallback:", err);
  }

  return (
    <ProductScreen
      kind={kind}
      {...product}
      plans={hydratedPlans}
      initialBalance={initialBalance}
    />
  );
}
