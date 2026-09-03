import Image from "next/image";
import type { ReactNode } from "react";
import { TbCurrencyNaira } from "react-icons/tb";
import { getAssetLogo } from "@/lib/assets";
import type { CardRow, CardStatus, Stat } from "@/lib/chat";
import { cn } from "@/lib/cn";

/** Rounded panel behind a structured agent reply — quote, receipt or chooser. */
export function ChatCard({
  className,
  padded = false,
  children,
}: {
  className?: string;
  /** Uniform padding, which is how the design lays out a plain list of rows. */
  padded?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex w-full flex-col gap-2.5 rounded-surface",
        padded ? "p-3" : "px-3 pt-4.5 pb-3",
        className ?? "bg-jumpa-neutral-95",
      )}
    >
      {children}
    </div>
  );
}

/** Card title with a status word, stat or pill opposite it. */
export function CardTitle({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    // gap-3 and the truncate keep a long provider name off the status word —
    // they ran together as "(sdex))Successful" when both were nowrap.
    <div className="flex items-center justify-between gap-3 pl-2.5">
      <h3 className="min-w-0 truncate text-sm leading-5 font-medium text-jumpa-black">
        {title}
      </h3>
      {children ? <span className="shrink-0">{children}</span> : null}
    </div>
  );
}

const STATUS_TONE = {
  pending: "bg-jumpa-primary-525 text-jumpa-primary-50",
  done: "bg-jumpa-alt-500 text-jumpa-primary-900",
} as const;

/** Purple while a ramp waits on the user, lime once it has settled. */
export function CardStatusPill({ status }: { status: CardStatus }) {
  return (
    <span
      className={cn(
        "flex h-5.5 items-center rounded-xl px-2.5 text-[11px] leading-4 whitespace-nowrap",
        STATUS_TONE[status.tone ?? "pending"],
      )}
    >
      {status.label}
    </span>
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

/**
 * Stats along the foot of a card. Two sit side by side, as the design draws
 * them; a longer list becomes a ledger — lead left, value right, one per line —
 * because two columns are too narrow for a network name or a hash.
 */
export function CardStats({ stats }: { stats: Stat[] }) {
  if (stats.length <= 2) {
    return (
      <div className="flex items-center justify-between gap-3 px-2.5">
        {stats.map((stat, idx) => (
          <StatText
            key={`${stat.lead || ""}-${stat.value}-${idx}`}
            stat={stat}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1 px-2.5">
      {stats.map((stat, idx) => (
        <div
          key={`${stat.lead || ""}-${stat.value}-${idx}`}
          className="flex items-baseline justify-between gap-3 text-[11px] leading-4"
        >
          <span className="shrink-0 text-jumpa-black/50">
            {stat.lead?.trim()}
          </span>
          <span className="min-w-0 text-right font-bold text-jumpa-black">
            {stat.value}
          </span>
        </div>
      ))}
    </div>
  );
}

/** Currency chip on an amount row: brand mark and ticker, or the naira glyph. */
export function AssetBadge({
  symbol,
  tone = "default",
}: {
  symbol: string;
  tone?: "default" | "brand";
}) {
  const isNaira = /^(ngn|naira)$/i.test(symbol.trim());
  const logo = isNaira ? null : getAssetLogo(symbol);

  return (
    <span
      className={cn(
        "flex h-full min-w-17 shrink-0 items-center justify-center gap-1.5 rounded-pill px-3 text-[13px] font-semibold shadow-2xs",
        tone === "brand"
          ? "bg-jumpa-primary-550 text-jumpa-white"
          : "bg-jumpa-neutral-95 text-jumpa-black",
      )}
    >
      {isNaira ? (
        <TbCurrencyNaira className="size-4 shrink-0" />
      ) : logo ? (
        <Image
          src={logo}
          alt=""
          width={20}
          height={20}
          className="size-5 shrink-0 rounded-full object-contain"
        />
      ) : null}
      <span>{symbol}</span>
    </span>
  );
}

/** White row inside a card: caption above a value, with an optional badge. */
export function CardAmount({
  row,
  badgeTone,
  isInput = false,
  inputValue,
  onInputChange,
}: {
  row: CardRow;
  badgeTone?: "default" | "brand";
  isInput?: boolean;
  inputValue?: string;
  onInputChange?: (val: string) => void;
}) {
  return (
    <div className="flex h-16 w-full items-center gap-2.5 rounded-surface bg-jumpa-white p-3">
      <span className="flex min-w-0 flex-1 flex-col gap-0.5 px-2">
        <span className="text-[10px] leading-3 font-bold tracking-wider text-jumpa-black/50 uppercase">
          {row.caption}
        </span>
        {isInput ? (
          <input
            type="number"
            step="any"
            min="0"
            value={inputValue !== undefined ? inputValue : row.value}
            onChange={(e) => onInputChange?.(e.target.value)}
            className="w-full truncate bg-transparent text-lg leading-5.5 font-medium text-jumpa-black outline-none"
          />
        ) : (
          <span className="truncate text-lg leading-5.5 font-medium text-jumpa-black">
            {row.value}
          </span>
        )}
      </span>

      {row.badge ? <AssetBadge symbol={row.badge} tone={badgeTone} /> : null}
    </div>
  );
}

/** Foot of a ramp card: "Payment Reference:   REF-789210". */
export function ReferenceLine({ reference }: { reference: string }) {
  return (
    <p className="px-2.5 text-[11px] leading-4 text-jumpa-black/50">
      Payment Reference:{" "}
      <span className="font-bold text-jumpa-black">{reference}</span>
    </p>
  );
}
