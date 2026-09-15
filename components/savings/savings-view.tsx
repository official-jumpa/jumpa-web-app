"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { SavingsBanner } from "@/components/savings/savings-banner";
import { SavingsIntroSheet } from "@/components/savings/savings-intro-sheet";
import { SAVINGS_INTROS } from "@/components/savings/savings-intros";
import { SavingsTypes } from "@/components/savings/savings-types";
import { TransferHeader } from "@/components/transfer/transfer-header";
import { PlusIcon } from "@/components/ui/icons/plus";
import { type SavingsKind, savingsHref } from "@/lib/savings";

interface SavingsViewProps {
  initialSeenIntros?: {
    individual?: boolean;
    lock?: boolean;
    circle?: boolean;
  };
  hasCreatedSavings?: boolean;
}

/** Savings landing: the masthead, then the three products. */
export function SavingsView({
  initialSeenIntros,
  hasCreatedSavings,
}: SavingsViewProps = {}) {
  const router = useRouter();
  const [seenIntros, setSeenIntros] = useState<{
    individual?: boolean;
    lock?: boolean;
    circle?: boolean;
  }>(initialSeenIntros ?? {});
  const [intro, setIntro] = useState<SavingsKind>();

  const fetchSeenIntros = useCallback(async () => {
    try {
      const res = await fetch("/api/savings");
      if (!res.ok) return;
      const data = await res.json();
      if (data?.seenSavingsIntros) {
        setSeenIntros(data.seenSavingsIntros);
      }
    } catch (err) {
      console.warn("[SavingsView] Failed to fetch seen intros:", err);
    }
  }, []);

  // If initialSeenIntros wasn't provided, fetch it on mount
  useEffect(() => {
    if (initialSeenIntros !== undefined) return;
    fetchSeenIntros();
  }, [initialSeenIntros, fetchSeenIntros]);

  const handleSelect = (kind: SavingsKind) => {
    const isSeen =
      seenIntros[kind] || (kind === "individual" && hasCreatedSavings);
    if (isSeen) {
      router.push(savingsHref(kind));
      return;
    }
    setIntro(kind);
  };

  const handleContinueIntro = async (kind: SavingsKind) => {
    setSeenIntros((prev) => ({ ...prev, [kind]: true }));
    try {
      await fetch("/api/savings/intro-seen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind }),
      });
    } catch (err) {
      console.warn("[SavingsView] Failed to mark intro as seen:", err);
    }
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
        <SavingsBanner title="Saving goals" />
      </div>

      <SavingsTypes onSelect={handleSelect} />

      {intro ? (
        <SavingsIntroSheet
          intro={SAVINGS_INTROS[intro]}
          onClose={() => setIntro(undefined)}
          onContinue={() => handleContinueIntro(intro)}
        />
      ) : null}
    </div>
  );
}
