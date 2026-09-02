"use client";

import Link from "next/link";
import { useState } from "react";
import { SendOptionsSheet } from "@/components/transfer/send-options-sheet";
import { ArrowDownRightIcon } from "@/components/ui/icons/arrow-down-right";
import { ArrowUpRightIcon } from "@/components/ui/icons/arrow-up-right";
import { ChevronDownIcon } from "@/components/ui/icons/chevron-down";
import { EyeIcon } from "@/components/ui/icons/eye";
import { EyeOffIcon } from "@/components/ui/icons/eye-off";
import { SwitchHorizontalIcon } from "@/components/ui/icons/switch-horizontal";
import { BalanceSheet } from "./balance-sheet";

/** Stands in for the digits while the balance is hidden. */
const MASK = "*".repeat(9);

const TRANSFER =
  "flex items-center gap-1.5 rounded-pill bg-jumpa-primary-500 py-1.5 pr-4 pl-1.5 text-base " +
  "font-medium text-jumpa-white shadow-[inset_0_0_8px_0_var(--color-jumpa-primary-400)]";

/**
 * Total balance and the transfer shortcuts. The eye masks the amount, the pill
 * opens the breakdown, and Send raises the chooser rather than navigating.
 */
export function BalancePanel({ balance }: { balance: string }) {
  const [visible, setVisible] = useState(false);
  const [sheet, setSheet] = useState<"details" | "send" | null>(null);
  const ToggleIcon = visible ? EyeOffIcon : EyeIcon;

  return (
    <section className="flex flex-col items-center gap-6">
      <div className="flex flex-col items-center gap-2">
        <button
          type="button"
          onClick={() => setSheet("details")}
          aria-haspopup="dialog"
          aria-expanded={sheet === "details"}
          className="tap flex items-center rounded-pill bg-jumpa-primary-950 px-4.5 py-2 text-xs leading-2.5 font-medium text-jumpa-white active:scale-95"
        >
          Balance Details
          <ChevronDownIcon className="size-4" />
        </button>

        <p className="flex items-center gap-2 text-jumpa-primary-50">
          {/* The 32px digits set the design's 34px line; the strut and "$" must not extend it. */}
          <span className="text-center leading-0 font-semibold">
            <span className="text-xl leading-none">$</span>
            <span className="text-[32px] leading-8.5">
              {visible ? balance : MASK}
            </span>
          </span>
          <button
            type="button"
            onClick={() => setVisible((on) => !on)}
            aria-label={visible ? "Hide balance" : "Show balance"}
          >
            <ToggleIcon className="size-6" />
          </button>
        </p>
      </div>

      <nav className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => setSheet("send")}
          aria-haspopup="dialog"
          aria-expanded={sheet === "send"}
          className={`tap ${TRANSFER} active:scale-95`}
        >
          <span className="flex size-8 items-center justify-center rounded-panel bg-jumpa-primary-400 text-jumpa-alt-400">
            <ArrowUpRightIcon className="size-6" />
          </span>
          Send
        </button>

        <Link href="/assets" className={TRANSFER}>
          <span className="flex size-8 items-center justify-center rounded-panel bg-jumpa-primary-400 text-jumpa-alt-400">
            <ArrowDownRightIcon className="size-6" />
          </span>
          Receive
        </Link>

        <Link href="/swap" className={TRANSFER}>
          <span className="flex size-8 items-center justify-center rounded-panel bg-jumpa-primary-400 text-jumpa-alt-400">
            <SwitchHorizontalIcon className="size-6" />
          </span>
          Swap
        </Link>
      </nav>

      {sheet === "details" ? (
        <BalanceSheet balance={balance} onClose={() => setSheet(null)} />
      ) : null}

      {sheet === "send" ? (
        <SendOptionsSheet onClose={() => setSheet(null)} />
      ) : null}
    </section>
  );
}
