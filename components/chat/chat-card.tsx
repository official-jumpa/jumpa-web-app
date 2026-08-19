import type { ReactNode } from "react";
import type { CardRow, Stat } from "@/lib/chat";
import { cn } from "@/lib/cn";

/** Rounded panel behind a structured agent reply — quote, receipt or transfer. */
export function ChatCard({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex w-full flex-col gap-2 rounded-surface px-2.5 pt-4 pb-2.5",
        className ?? "bg-jumpa-neutral-95",
      )}
    >
      {children}
    </div>
  );
}

/** Card title with a status word opposite it. */
export function CardTitle({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between px-2.5 whitespace-nowrap">
      <h3 className="text-xs leading-5 font-medium text-jumpa-black">
        {title}
      </h3>
      {children}
    </div>
  );
}

/** Figma draws this as a zero-height line, so the 1px is taken back below it. */
export function CardRule() {
  return <span aria-hidden="true" className="rule-dashed -mb-px h-px w-full" />;
}

/** Muted lead-in plus an emphasised value, e.g. "Fee **0.3 XLM**". */
export function StatText({
  stat,
  className,
}: {
  stat: Stat;
  className?: string;
}) {
  return (
    <p className={cn("text-[8px] leading-4 text-jumpa-black/50", className)}>
      {stat.lead}
      <span className="font-bold text-jumpa-black">{stat.value}</span>
    </p>
  );
}

export function CardStats({ stats }: { stats: [Stat, Stat] }) {
  return (
    <div className="flex items-center justify-between px-2.5 whitespace-nowrap">
      {stats.map((stat) => (
        <StatText key={stat.value} stat={stat} />
      ))}
    </div>
  );
}

/** White row inside a card: caption above a value, with an optional badge. */
export function CardAmount({
  row,
  badgeClassName = "bg-jumpa-neutral-95 text-jumpa-black",
}: {
  row: CardRow;
  badgeClassName?: string;
}) {
  return (
    <div className="flex h-11.5 w-full items-center gap-2.5 rounded-surface bg-jumpa-white p-2.5">
      <span className="flex min-w-0 flex-1 flex-col px-2.5">
        <span className="text-[6px] leading-2.5 text-jumpa-black/50">
          {row.caption}
        </span>
        <span className="truncate text-base leading-4 font-medium text-jumpa-black">
          {row.value}
        </span>
      </span>

      {row.badge ? (
        <span
          className={cn(
            "flex h-full w-11.5 shrink-0 items-center justify-center rounded-pill text-xs",
            badgeClassName,
          )}
        >
          {row.badge}
        </span>
      ) : null}
    </div>
  );
}
