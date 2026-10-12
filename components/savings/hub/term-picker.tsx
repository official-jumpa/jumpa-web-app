"use client";

import { useState } from "react";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { CalendarIcon } from "@/components/ui/icons/calendar";
import { ChevronDownIcon } from "@/components/ui/icons/chevron-down";
import { cn } from "@/lib/cn";
import {
  apyForDays,
  formatApy,
  MONTH_TERMS,
  type SavingsKind,
  termName,
} from "@/lib/savings";

const TILE = {
  on: "bg-jumpa-primary-600",
  off: "bg-jumpa-primary-50 inset-ring-1 inset-ring-jumpa-primary-100",
};
const FIGURE = { on: "text-jumpa-white", off: "text-jumpa-primary-950" };
const UNIT = { on: "text-jumpa-primary-100", off: "text-jumpa-neutral-500" };
const RATE = { on: "text-jumpa-alt-400", off: "text-jumpa-primary-600" };

/**
 * How long a plan runs, with the rate each length earns in view while
 * choosing. `openEnded` adds the no-deadline option a flexible goal allows.
 */
export function TermPicker({
  kind,
  label,
  value,
  onChange,
  openEnded = false,
}: {
  kind: SavingsKind;
  label: string;
  /** Days, or `null` for no deadline. */
  value: number | null;
  onChange: (days: number | null) => void;
  openEnded?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const apy = formatApy(apyForDays(kind, value));
  const pick = (days: number | null) => {
    onChange(days);
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-label={`${label}: ${termName(value)}, ${apy} a year`}
        onClick={() => setOpen(true)}
        className="tap flex h-14 w-full items-center gap-2.5 rounded-surface border border-jumpa-grey-100 bg-jumpa-white px-2.5 text-left active:scale-98"
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-jumpa-primary-50 text-jumpa-primary-600">
          <CalendarIcon className="size-4.5" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-sm leading-4 font-semibold text-jumpa-black">
            {termName(value)}
          </span>
          <span className="truncate text-[11px] leading-3.5 text-jumpa-neutral-500">
            {value === null ? "Save as you go" : `${value} days`}
          </span>
        </span>
        <span className="shrink-0 rounded-pill bg-jumpa-primary-600 px-2.5 py-1 text-[11px] leading-3.5 font-semibold text-jumpa-alt-400">
          {apy} APY
        </span>
        <ChevronDownIcon className="size-4 shrink-0 text-jumpa-neutral-500" />
      </button>

      {open ? (
        <BottomSheet onClose={() => setOpen(false)} pb="pb-7.5">
          <div className="flex flex-col gap-5 pt-1">
            <div className="flex flex-col items-center gap-1.5 text-center">
              <h2 className="text-lg leading-6 font-semibold text-jumpa-black">
                {label}
              </h2>
              <p className="text-xs leading-4 text-jumpa-neutral-500">
                The longer you commit, the more you earn.
              </p>
            </div>

            {openEnded ? (
              <OpenEndedTile
                active={value === null}
                apy={formatApy(apyForDays(kind, null))}
                onPick={() => pick(null)}
              />
            ) : null}

            <div className="grid grid-cols-3 gap-2">
              {MONTH_TERMS.map((term) => {
                const active = term.days === value;
                const tone = (text: typeof FIGURE) =>
                  active ? text.on : text.off;
                return (
                  <button
                    key={term.days}
                    type="button"
                    aria-pressed={active}
                    onClick={() => pick(term.days)}
                    className={cn(
                      "tap flex h-18 flex-col items-center justify-center rounded-xl active:scale-95",
                      active ? TILE.on : TILE.off,
                    )}
                  >
                    <span
                      className={cn(
                        "text-xl leading-6 font-semibold",
                        tone(FIGURE),
                      )}
                    >
                      {term.months}
                    </span>
                    <span className={cn("text-[11px] leading-3.5", tone(UNIT))}>
                      {term.months === 1 ? "month" : "months"}
                    </span>
                    <span
                      className={cn(
                        "mt-1 text-[11px] leading-3.5 font-semibold",
                        tone(RATE),
                      )}
                    >
                      {formatApy(apyForDays(kind, term.days))}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </BottomSheet>
      ) : null}
    </>
  );
}

/** A flexible goal's first choice: no end date, at the base rate. */
function OpenEndedTile({
  active,
  apy,
  onPick,
}: {
  active: boolean;
  apy: string;
  onPick: () => void;
}) {
  const tone = (text: typeof FIGURE) => (active ? text.on : text.off);
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onPick}
      className={cn(
        "tap flex h-14 items-center justify-between gap-3 rounded-xl px-4 text-left active:scale-98",
        active ? TILE.on : TILE.off,
      )}
    >
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className={cn("text-sm leading-4 font-semibold", tone(FIGURE))}>
          No deadline
        </span>
        <span className={cn("text-[11px] leading-3.5", tone(UNIT))}>
          Save as you go
        </span>
      </span>
      <span
        className={cn("shrink-0 text-xs leading-4 font-semibold", tone(RATE))}
      >
        {apy}
      </span>
    </button>
  );
}
