import Image from "next/image";
import type { ReactNode } from "react";
import { BadgePercentIcon } from "@/components/ui/icons/badge-percent";

/**
 * The purple card both hub screens open on — the same gradient and grid as
 * `SavingsBalance`, with room for a control in the corner and a meter below.
 */
export function HubHero({
  badge,
  aside,
  meter,
  children,
}: {
  badge: string;
  /** Top-right slot: the currency toggle, or a plan's status. */
  aside?: ReactNode;
  /** Progress under the amount. */
  meter?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="relative flex flex-col overflow-hidden rounded-key bg-[linear-gradient(to_bottom,var(--color-jumpa-primary-600),var(--color-jumpa-primary-700))]">
      <Image
        src="/images/savings/lock-grid.svg"
        alt=""
        aria-hidden="true"
        width={357}
        height={328}
        className="pointer-events-none absolute top-1/2 left-1/2 max-w-none -translate-x-1/2 -translate-y-1/2 opacity-50"
      />

      <div className="relative flex items-center justify-between gap-3 px-4 pt-4">
        <span className="min-w-0 truncate rounded-pill bg-jumpa-primary-950 px-2.75 py-1 text-[10px] leading-3 text-jumpa-white">
          {badge}
        </span>
        {aside}
      </div>

      <div
        className={`relative flex flex-col items-center gap-1 px-4 pt-4 text-center ${meter ? "pb-4" : "pb-5"}`}
      >
        {children}
      </div>

      {meter ? <div className="relative px-4 pb-4">{meter}</div> : null}
    </section>
  );
}

/** Symbol a step smaller than the figure, as `SavingsBalance` sets it. */
export function HeroAmount({
  symbol,
  figure,
}: {
  symbol: string;
  figure: string;
}) {
  return (
    <p className="flex items-baseline whitespace-nowrap text-jumpa-primary-50">
      <span className="text-2xl leading-9.75 font-semibold">{symbol}</span>
      <span className="text-4xl leading-9.75 font-semibold">{figure}</span>
    </p>
  );
}

/**
 * What the money has earned, straight under the figure it was earned on.
 * `earned` is null when there is nothing to show, e.g. a lock left early.
 */
export function HeroInterest({
  earned,
  caption,
}: {
  earned: string | null;
  caption: string;
}) {
  return (
    <span className="mt-2 inline-flex max-w-full items-center gap-1.5 rounded-pill bg-jumpa-white/15 px-3 py-1.5 text-xs leading-4 whitespace-nowrap text-jumpa-primary-50">
      <BadgePercentIcon className="size-4 shrink-0 text-jumpa-alt-400" />
      {earned ? (
        <span className="font-semibold text-jumpa-alt-400">+{earned}</span>
      ) : null}
      <span className="truncate">{caption}</span>
    </span>
  );
}
