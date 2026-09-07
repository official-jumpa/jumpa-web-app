"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { EmptyPlans } from "@/components/savings/empty-plans";
import { PlanCard } from "@/components/savings/plan-card";
import { SavingsBalance } from "@/components/savings/savings-balance";
import { TransferHeader } from "@/components/transfer/transfer-header";
import { PlusIcon } from "@/components/ui/icons/plus";
import type { SavingsKind, SavingsPlan } from "@/lib/savings";
import { SAVINGS_BALANCE, savingsHref } from "@/lib/savings";

/**
 * One product's own landing — total, create button and the plans under it.
 * Lock, individual and circles differ only in their labels and destinations.
 */
export function ProductScreen({
  kind,
  title,
  cta,
  listLabel,
  emptyTitle,
  emptyCaption,
  plans: initialPlans = [],
}: {
  kind: SavingsKind;
  title: string;
  cta: string;
  listLabel: string;
  emptyTitle: string;
  emptyCaption?: string;
  plans?: SavingsPlan[];
}) {
  const newHref = savingsHref(kind, { create: true });
  const [plans, setPlans] = useState<SavingsPlan[]>(initialPlans);
  const defaultBalance = SAVINGS_BALANCE[kind];
  const [balance, setBalance] = useState<{
    badge: string;
    amount: string;
    rate?: string;
  }>(defaultBalance);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPlans() {
      try {
        setLoading(true);
        const res = await fetch(`/api/savings?type=${kind}`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.plans)) {
            setPlans(data.plans);
          }
          if (data.summary) {
            setBalance({
              badge: defaultBalance.badge,
              amount: data.summary.saved || "0",
              rate:
                data.summary.apy ||
                ("rate" in defaultBalance ? defaultBalance.rate : undefined),
            });
          }
        }
      } catch (err) {
        console.error(`Failed to load plans for ${kind}:`, err);
      } finally {
        setLoading(false);
      }
    }
    loadPlans();
  }, [kind]);

  return (
    <div className="flex min-h-dvh flex-col px-4.5 pt-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
      <TransferHeader
        back="/savings"
        title={title}
        action={
          <Link
            href={newHref}
            aria-label={cta}
            className="tap flex size-9.5 items-center justify-center rounded-full border border-jumpa-primary-600 bg-jumpa-secondary-150 text-jumpa-primary-600 active:scale-95"
          >
            <PlusIcon className="size-3.5" />
          </Link>
        }
      />

      <div className="mt-4 flex flex-col gap-2">
        <SavingsBalance {...balance} />
        <Link
          href={newHref}
          className="tap flex h-11 items-center justify-center rounded-pill bg-jumpa-primary-600 text-xs leading-3 font-semibold text-jumpa-primary-50 active:scale-[0.98]"
        >
          {cta}
        </Link>
      </div>

      <section className="mt-5 flex flex-col gap-3">
        <h2 className="text-xs font-medium text-jumpa-black">{listLabel}</h2>
        {plans.length === 0 ? (
          <EmptyPlans title={emptyTitle} caption={emptyCaption} />
        ) : (
          plans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              href={savingsHref(kind, { id: plan.id })}
            />
          ))
        )}
      </section>
    </div>
  );
}
