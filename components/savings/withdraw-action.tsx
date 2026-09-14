"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PLAN_ACTION_BUTTON } from "@/components/savings/plan-actions";
import { WithdrawWarningSheet } from "@/components/savings/withdraw-warning-sheet";
import { ArrowUpFromArcIcon } from "@/components/ui/icons/arrow-up-from-arc";

/**
 * An active plan raises the early-withdrawal warning first; a matured or
 * closed one has nothing early about it, so it links straight through.
 */
export function WithdrawAction({
  href,
  warn,
}: {
  href: string;
  warn: boolean;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <>
      <button
        type="button"
        onClick={() => (warn ? setOpen(true) : router.push(href))}
        className={PLAN_ACTION_BUTTON}
      >
        <ArrowUpFromArcIcon className="size-6 text-jumpa-primary-600" />
        Withdraw
      </button>

      {open ? (
        <WithdrawWarningSheet
          onKeep={() => setOpen(false)}
          onWithdrawAnyway={() => router.push(href)}
        />
      ) : null}
    </>
  );
}
