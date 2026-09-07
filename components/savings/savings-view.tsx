"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { SavingsBanner, type SavingsSummaryData } from "@/components/savings/savings-banner";
import { SavingsIntroSheet } from "@/components/savings/savings-intro-sheet";
import { SAVINGS_INTROS } from "@/components/savings/savings-intros";
import { SavingsTypes } from "@/components/savings/savings-types";
import { TransferHeader } from "@/components/transfer/transfer-header";
import { PlusIcon } from "@/components/ui/icons/plus";
import { type SavingsKind, savingsHref } from "@/lib/savings";

/** Savings landing: the running total, then the three products. */
export function SavingsView({ hasGoals: initialHasGoals }: { hasGoals: boolean }) {
  const router = useRouter();
  const [intro, setIntro] = useState<SavingsKind>();
  const [summary, setSummary] = useState<SavingsSummaryData>();
  const [hasGoals, setHasGoals] = useState(initialHasGoals);
  const [hasCreatedSavings, setHasCreatedSavings] = useState(false);
  const [seenIntros, setSeenIntros] = useState<Record<SavingsKind, boolean>>({
    individual: false,
    lock: false,
    circle: false,
  });

  useEffect(() => {
    async function loadSummary() {
      try {
        const res = await fetch("/api/savings");
        if (res.ok) {
          const data = await res.json();
          if (data.seenSavingsIntros) {
            setSeenIntros({
              individual: Boolean(data.seenSavingsIntros.individual),
              lock: Boolean(data.seenSavingsIntros.lock),
              circle: Boolean(data.seenSavingsIntros.circle),
            });
          }
          if (data.hasCreatedSavings !== undefined) {
            setHasCreatedSavings(Boolean(data.hasCreatedSavings));
          }
          if (data.summary) {
            setSummary(data.summary);
            setHasGoals(data.summary.goals > 0);
          }
        }
      } catch (err) {
        console.error("Failed to load savings summary:", err);
      }
    }
    loadSummary();
  }, []);

  const handleSelect = (kind: SavingsKind) => {
    // If the intro for this specific kind was already acknowledged by clicking CTA:
    if (seenIntros[kind]) {
      router.push(SAVINGS_INTROS[kind].href);
      return;
    }
    setIntro(kind);
  };

  const handleCta = (kind: SavingsKind) => {
    // 1. Immediately mark as seen in local state so it stops showing
    setSeenIntros((prev) => ({ ...prev, [kind]: true }));
    setIntro(undefined);

    // 2. Persist to DB in models/User.ts
    fetch(`/api/savings/intro-seen?kind=${kind}`, { method: "POST" }).catch((err) => {
      console.warn("Failed to persist seen intro:", err);
    });

    // 3. Navigate to product screen
    router.push(SAVINGS_INTROS[kind].href);
  };

  return (
    <div className="flex min-h-dvh flex-col px-4.5 pt-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
      <TransferHeader
        back="/home"
        title="Savings"
        action={
          <Link
            href={savingsHref("individual", { create: true })}
            aria-label="Start a new savings goal"
            className="tap flex size-9.5 items-center justify-center rounded-full border border-jumpa-primary-600 bg-jumpa-secondary-150 text-jumpa-primary-600 active:scale-95"
          >
            <PlusIcon className="size-3.5" />
          </Link>
        }
      />

      <div className="mt-3">
        <SavingsBanner title="Saving goals" progress={hasGoals} summary={summary} />
      </div>

      <div className="mt-4">
        <SavingsTypes onSelect={handleSelect} />
      </div>

      {intro ? (
        <SavingsIntroSheet
          kind={intro}
          intro={SAVINGS_INTROS[intro]}
          onClose={() => setIntro(undefined)}
          onCta={handleCta}
        />
      ) : null}
    </div>
  );
}
