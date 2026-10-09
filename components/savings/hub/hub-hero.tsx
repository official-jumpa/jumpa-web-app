import Image from "next/image";
import type { ReactNode } from "react";

/**
 * The purple card both hub screens open on — the same gradient and grid as
 * `SavingsBalance`, with room for a control in the corner and a stat row.
 */
export function HubHero({
  badge,
  aside,
  meter,
  foot,
  children,
}: {
  badge: string;
  /** Top-right slot: the currency toggle, or a plan's status. */
  aside?: ReactNode;
  /** Progress under the amount. */
  meter?: ReactNode;
  /** Stat row along the bottom edge. */
  foot?: ReactNode;
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

      <div className="relative flex flex-col items-center gap-1.5 px-4 pt-5 pb-5 text-center">
        {children}
      </div>

      {meter ? <div className="relative px-4 pb-4">{meter}</div> : null}

      {foot ? (
        <div className="relative flex items-end justify-between gap-3 border-t border-jumpa-white/20 px-4 pt-2.5 pb-3">
          {foot}
        </div>
      ) : null}
    </section>
  );
}

/** Holds the equivalent chip's height before the rate lands, so nothing below it jumps. */
export function HeroNote({ children }: { children: ReactNode }) {
  return (
    <span className="flex h-5.5 items-center justify-center">{children}</span>
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

export function HeroStat({
  label,
  value,
  accent = false,
  align = "start",
}: {
  label: string;
  value: string;
  /** Lime for the figure the card is selling — interest. */
  accent?: boolean;
  align?: "start" | "end";
}) {
  return (
    <span
      className={`flex min-w-0 flex-col gap-0.5 ${align === "end" ? "items-end text-right" : ""}`}
    >
      <span className="text-[10px] leading-3 text-jumpa-primary-100">
        {label}
      </span>
      <span
        className={`truncate text-sm leading-4 font-semibold ${accent ? "text-jumpa-alt-400" : "text-jumpa-white"}`}
      >
        {value}
      </span>
    </span>
  );
}
