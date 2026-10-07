import Image from "next/image";
import { type ReactNode, useEffect, useState } from "react";
import { NairaSignIcon } from "@/components/ui/icons/naira-sign";
import { LocalTime } from "@/components/ui/local-time";
import { getAssetLogo } from "@/lib/assets";
import type { CardRow, CardStatus, Stat } from "@/lib/chat";
import { copyText } from "@/lib/clipboard";
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
  failed: "bg-jumpa-warning-50 text-jumpa-warning",
} as const;

/**
 * Purple while a ramp waits on the user, lime once it has settled. `failed`
 * carries the same tone the ramp cards' error notices do.
 */
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

/** Muted lead-in plus an emphasised value, e.g. "Fee **0.3 XLM**", or with asset & chain badge. */
/** A timestamp stat carries `at`, so it reads in the viewer's zone rather than the server's. */
function StatValue({ stat }: { stat: Stat }) {
  return stat.at ? (
    <LocalTime at={stat.at} fallback={stat.value} format="clock" />
  ) : (
    <span>{stat.value}</span>
  );
}

export function StatText({
  stat,
  className,
}: {
  stat: Stat;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-1.5 text-[11px] leading-4 text-jumpa-black/50", className)}>
      <span>{stat.lead}</span>
      <span className="font-bold text-jumpa-black">
        <StatValue stat={stat} />
      </span>
      {stat.badge ? (
        <span className="inline-flex items-center gap-1 font-semibold text-jumpa-black">
          <Image
            src={getAssetLogo(stat.badge)}
            alt={stat.badge}
            width={14}
            height={14}
            className="size-3.5 shrink-0 rounded-full object-contain"
          />
          {stat.chain ? (
            <>
              <span className="text-[10px] text-jumpa-neutral-400 font-normal">on</span>
              <Image
                src={getAssetLogo(stat.chain)}
                alt={stat.chain}
                width={14}
                height={14}
                className="size-3.5 shrink-0 rounded-full object-contain"
              />
            </>
          ) : null}
        </span>
      ) : null}
    </div>
  );
}

/**
 * Stats along the foot of a card. Two sit side by side, as the design draws
 * them; a longer list becomes a ledger — lead left, value right, one per line —
 * because two columns are too narrow for a network name or a hash.
 */
export function CardStats({ stats = [] }: { stats?: Stat[] }) {
  if (!stats || stats.length === 0) return null;

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
          <span className="inline-flex items-center gap-1 min-w-0 text-right font-bold text-jumpa-black">
            <StatValue stat={stat} />
            {stat.badge ? (
              <span className="inline-flex items-center gap-1 font-semibold text-jumpa-black">
                <Image
                  src={getAssetLogo(stat.badge)}
                  alt={stat.badge}
                  width={14}
                  height={14}
                  className="size-3.5 shrink-0 rounded-full object-contain"
                />
                {stat.chain ? (
                  <>
                    <span className="text-[10px] text-jumpa-neutral-400 font-normal">on</span>
                    <Image
                      src={getAssetLogo(stat.chain)}
                      alt={stat.chain}
                      width={14}
                      height={14}
                      className="size-3.5 shrink-0 rounded-full object-contain"
                    />
                  </>
                ) : null}
              </span>
            ) : null}
          </span>
        </div>
      ))}
    </div>
  );
}

/**
 * Currency chip on an amount row: brand mark and ticker, or the naira glyph.
 * A bridge names the chain too, so the chip reads "USDC on <mark>".
 */
export function AssetBadge({
  symbol = "",
  chain,
  tone = "default",
}: {
  symbol?: string;
  chain?: string;
  tone?: "default" | "brand";
}) {
  const cleanSymbol = typeof symbol === "string" ? symbol.trim() : "";
  if (!cleanSymbol) return null;

  const isNaira = /^(ngn|naira)$/i.test(cleanSymbol);
  const logo = isNaira ? null : getAssetLogo(cleanSymbol);

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
        <NairaSignIcon className="size-3.5 shrink-0" />
      ) : logo ? (
        <Image
          src={logo}
          alt=""
          width={20}
          height={20}
          className="size-5 shrink-0 rounded-full object-contain"
        />
      ) : null}
      <span>{cleanSymbol}</span>

      {chain ? (
        <>
          <span className="text-[10px] font-normal">on</span>
          <Image
            src={getAssetLogo(chain)}
            alt={chain}
            width={16}
            height={16}
            className="size-4 shrink-0 rounded-full object-contain"
          />
        </>
      ) : null}
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
  row?: CardRow;
  badgeTone?: "default" | "brand";
  isInput?: boolean;
  inputValue?: string;
  onInputChange?: (val: string) => void;
}) {
  const safeRow: CardRow = row || { caption: "", value: "" };

  return (
    <div className="flex h-16 w-full items-center gap-2.5 rounded-surface bg-jumpa-white p-3">
      <span className="flex min-w-0 flex-1 flex-col gap-0.5 px-2">
        <span className="text-[10px] leading-3 font-bold tracking-wider text-jumpa-black/50 uppercase">
          {safeRow.caption}
        </span>
        {isInput ? (
          <input
            type="number"
            step="any"
            min="0"
            value={inputValue !== undefined ? inputValue : safeRow.value}
            onChange={(e) => onInputChange?.(e.target.value)}
            className="w-full truncate bg-transparent text-lg leading-5.5 font-medium text-jumpa-black outline-none"
          />
        ) : (
          <span className="truncate text-lg leading-5.5 font-medium text-jumpa-black">
            {safeRow.value}
          </span>
        )}
      </span>

      {safeRow.badge ? (
        <AssetBadge symbol={safeRow.badge} chain={safeRow.chain} tone={badgeTone} />
      ) : null}
    </div>
  );
}

/** Foot of a ramp card: Truncated and copyable payment reference */
export function ReferenceLine({ reference }: { reference: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timer);
  }, [copied]);

  if (!reference) return null;

  const truncated =
    reference.length > 16
      ? `${reference.slice(0, 8)}...${reference.slice(-6)}`
      : reference;

  return (
    <div className="flex items-center justify-between gap-2 px-2.5 text-[11px] leading-4 text-jumpa-black/50">
      <span>Payment Reference:</span>
      <button
        type="button"
        onClick={() => {
          copyText(reference);
          setCopied(true);
        }}
        title="Click to copy full reference"
        className="tap inline-flex items-center gap-1.5 rounded-md bg-jumpa-neutral-100 px-2 py-0.5 font-bold font-mono text-jumpa-black hover:bg-jumpa-neutral-200 active:scale-95"
      >
        <span>{truncated}</span>
        {copied ? (
          <span className="text-[10px] text-jumpa-primary-600 font-semibold">Copied!</span>
        ) : (
          <svg
            className="size-3 text-jumpa-neutral-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
        )}
      </button>
    </div>
  );
}
