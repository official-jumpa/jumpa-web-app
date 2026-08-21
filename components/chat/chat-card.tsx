import Image from "next/image";
import type { ReactNode } from "react";
import { TbCurrencyNaira } from "react-icons/tb";
import { getAssetLogo } from "@/lib/assets";
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
        "flex w-full flex-col gap-2.5 rounded-surface px-3.5 pt-4.5 pb-3.5 shadow-xs",
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
    // gap-3 and the truncate keep a long provider name off the status word —
    // they ran together as "(sdex))Successful" when both were nowrap.
    <div className="flex items-center justify-between gap-3 px-1">
      <h3 className="min-w-0 truncate text-sm leading-5 font-medium text-jumpa-black">
        {title}
      </h3>
      <span className="shrink-0 whitespace-nowrap">{children}</span>
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
    <p className={cn("text-[11px] leading-4 text-jumpa-black/50", className)}>
      {stat.lead}
      <span className="font-bold text-jumpa-black">{stat.value}</span>
    </p>
  );
}

export function CardStats({ stats }: { stats: [Stat, Stat] }) {
  return (
    <div className="flex items-start justify-between gap-3 px-1">
      {stats.map((stat, idx) => (
        <StatText key={`${stat.value}-${idx}`} stat={stat} />
      ))}
    </div>
  );
}

/** White row inside a card: caption above a value, with an optional asset badge and input support. */
export function CardAmount({
  row,
  badgeClassName = "bg-jumpa-neutral-95 text-jumpa-black",
  isInput = false,
  inputValue,
  onInputChange,
}: {
  row: CardRow;
  badgeClassName?: string;
  isInput?: boolean;
  inputValue?: string;
  onInputChange?: (val: string) => void;
}) {
  const isNaira =
    row.badge?.toUpperCase() === "NGN" || row.badge?.toUpperCase() === "NAIRA";
  const logo = row.badge && !isNaira ? getAssetLogo(row.badge) : null;

  return (
    <div className="flex h-16 w-full items-center gap-2.5 rounded-surface bg-jumpa-white p-3">
      <span className="flex min-w-0 flex-1 flex-col gap-0.5 px-2">
        <span className="text-[10px] leading-3 font-bold uppercase tracking-wider text-jumpa-black/50">
          {row.caption}
        </span>
        {isInput ? (
          <input
            type="number"
            step="any"
            min="0"
            value={inputValue !== undefined ? inputValue : row.value}
            onChange={(e) => onInputChange?.(e.target.value)}
            className="w-full truncate text-lg leading-5.5 font-medium text-jumpa-black outline-none bg-transparent"
          />
        ) : (
          <span className="truncate text-lg leading-5.5 font-medium text-jumpa-black flex items-center gap-0.5">
            {row.value}
          </span>
        )}
      </span>

      {row.badge ? (
        <span
          className={cn(
            "flex h-full min-w-17 items-center justify-center gap-1.5 rounded-pill px-3 text-[13px] font-semibold shrink-0 shadow-2xs",
            badgeClassName,
          )}
        >
          {isNaira ? (
            <TbCurrencyNaira className="size-4 shrink-0 font-bold text-jumpa-black" />
          ) : logo ? (
            <Image
              src={logo}
              alt={row.badge}
              width={20}
              height={20}
              className="size-5 shrink-0 rounded-full object-contain"
            />
          ) : null}
          <span>{row.badge}</span>
        </span>
      ) : null}
    </div>
  );
}
