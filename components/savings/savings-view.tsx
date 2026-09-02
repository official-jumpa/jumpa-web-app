"use client";

import Link from "next/link";
import { useState } from "react";
import { SavingsBanner } from "@/components/savings/savings-banner";
import { SavingsIntroSheet } from "@/components/savings/savings-intro-sheet";
import { SAVINGS_INTROS } from "@/components/savings/savings-intros";
import { SavingsTypes } from "@/components/savings/savings-types";
import { TransferHeader } from "@/components/transfer/transfer-header";
import { PlusIcon } from "@/components/ui/icons/plus";
import type { SavingsKind } from "@/lib/savings";

/** Savings landing: the running total, then the three products. */
export function SavingsView({ hasGoals }: { hasGoals: boolean }) {
  const [intro, setIntro] = useState<SavingsKind>();

  return (
    <div className="flex min-h-dvh flex-col px-4.5 pt-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
      <TransferHeader
        back="/home"
        title="Savings"
        action={
          <Link
            href="/savings/individual/new"
            aria-label="Start a new savings goal"
            className="tap flex size-9.5 items-center justify-center rounded-full border border-jumpa-primary-600 bg-jumpa-secondary-150 text-jumpa-primary-600 active:scale-95"
          >
            <PlusIcon className="size-3.5" />
          </Link>
        }
      />

      <div className="mt-3">
        <SavingsBanner title="Saving goals" progress={hasGoals} />
      </div>

      <div className="mt-4">
        <SavingsTypes onSelect={setIntro} />
      </div>

      {intro ? (
        <SavingsIntroSheet
          intro={SAVINGS_INTROS[intro]}
          onClose={() => setIntro(undefined)}
        />
      ) : null}
    </div>
  );
}
