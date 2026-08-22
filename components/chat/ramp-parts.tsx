import Image from "next/image";
import { type ReactNode, useEffect, useState } from "react";
import { TbCurrencyNaira } from "react-icons/tb";
import { CheckIcon } from "@/components/ui/icons/check";
import { ChevronDownIcon } from "@/components/ui/icons/chevron-down";
import { CircleInformationIcon } from "@/components/ui/icons/circle-information";
import { CopyIcon } from "@/components/ui/icons/copy";
import { getAssetLogo } from "@/lib/assets";
import { copyText } from "@/lib/clipboard";
import { cn } from "@/lib/cn";

/** Shared pieces for the on- and off-ramp checkout cards, so the two stay in step. */

export type RampTone = "pending" | "done" | "error";

const TONE: Record<RampTone, string> = {
  pending: "bg-jumpa-secondary-100 text-jumpa-primary-950",
  done: "bg-jumpa-alt-400 text-jumpa-alt-950",
  error: "bg-jumpa-danger-50 text-jumpa-danger",
};

export function RampShell({
  title,
  status,
  tone,
  children,
}: {
  title: string;
  status: string;
  tone: RampTone;
  children: ReactNode;
}) {
  return (
    <div className="w-full overflow-hidden rounded-surface border border-jumpa-neutral-100 bg-jumpa-white shadow-xs">
      <div className="flex items-center justify-between gap-3 px-3.5 pt-3.5 pb-3">
        <h3 className="min-w-0 truncate text-[13px] leading-5 font-semibold text-jumpa-black">
          {title}
        </h3>
        <span
          className={cn(
            "shrink-0 rounded-pill px-2 py-0.5 text-[10px] leading-4 font-semibold whitespace-nowrap",
            TONE[tone],
          )}
        >
          {status}
        </span>
      </div>
      <span aria-hidden="true" className="rule-dashed block h-px w-full" />
      <div className="flex flex-col gap-3 p-3.5">{children}</div>
    </div>
  );
}

/** Currency badge — the naira glyph has no logo file, every token does. */
function AssetChip({ symbol }: { symbol: string }) {
  const isNaira = /^(ngn|naira)$/i.test(symbol.trim());

  return (
    <span className="flex shrink-0 items-center gap-1.5 rounded-pill bg-jumpa-white py-1 pr-2.5 pl-1 shadow-2xs">
      {isNaira ? (
        <TbCurrencyNaira className="size-4.5 shrink-0 text-jumpa-black" />
      ) : (
        <Image
          src={getAssetLogo(symbol)}
          alt=""
          width={18}
          height={18}
          className="size-4.5 shrink-0 rounded-full object-contain"
        />
      )}
      <span className="text-[11px] leading-4 font-semibold text-jumpa-black">
        {symbol}
      </span>
    </span>
  );
}

function AmountLine({
  caption,
  value,
  badge,
}: {
  caption: string;
  value: string;
  badge: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="flex min-w-0 flex-col">
        <span className="text-[10px] leading-3.5 font-medium tracking-wide text-jumpa-warm-700 uppercase">
          {caption}
        </span>
        <span className="truncate text-lg leading-6 font-semibold text-jumpa-black">
          {value}
        </span>
      </span>
      <AssetChip symbol={badge} />
    </div>
  );
}

/** The whole trade in one warm block: what goes out, what comes back. */
export function ConversionBlock({
  from,
  to,
}: {
  from: { caption: string; value: string; badge: string };
  to: { caption: string; value: string; badge: string };
}) {
  return (
    <div className="rounded-surface border border-jumpa-warm-200 bg-jumpa-warm-50 p-3">
      <AmountLine {...from} />
      <div className="my-2 flex items-center">
        <span aria-hidden="true" className="rule-dashed h-px flex-1" />
        <span className="mx-2 flex size-5 items-center justify-center rounded-pill bg-jumpa-warm-100 text-jumpa-warm-700">
          <ChevronDownIcon className="size-3" />
        </span>
        <span aria-hidden="true" className="rule-dashed h-px flex-1" />
      </div>
      <AmountLine {...to} />
    </div>
  );
}

export function StepLabel({
  step,
  children,
}: {
  step: number;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex size-4.5 shrink-0 items-center justify-center rounded-pill bg-jumpa-primary-600 text-[9px] leading-none font-bold text-jumpa-white">
        {step}
      </span>
      <span className="text-[11px] leading-4 font-semibold text-jumpa-black">
        {children}
      </span>
    </div>
  );
}

export function DetailBox({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 rounded-surface border border-jumpa-neutral-100 bg-jumpa-neutral-50 p-3">
      {children}
    </div>
  );
}

export function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="shrink-0 text-[11px] leading-4 text-jumpa-neutral-400">
        {label}
      </span>
      <span className="min-w-0 text-right text-xs leading-4 font-semibold text-jumpa-black">
        {value}
      </span>
    </div>
  );
}

/**
 * The one value the user has to act on. `wrap` is for a deposit address, which
 * is too long to truncate usefully.
 */
export function CopyField({
  label,
  value,
  wrap,
}: {
  label: string;
  value: string;
  wrap?: boolean;
}) {
  return (
    <div className="flex items-end justify-between gap-2 border-t border-jumpa-neutral-100 pt-2">
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="text-[10px] leading-3.5 font-medium tracking-wide text-jumpa-neutral-400 uppercase">
          {label}
        </span>
        <span
          className={cn(
            "font-semibold text-jumpa-primary-950",
            wrap
              ? "text-[11px] leading-4 break-all"
              : "truncate text-base leading-5.5 tracking-wide tabular-nums",
          )}
        >
          {value}
        </span>
      </span>
      <CopyPill value={value} />
    </div>
  );
}

const CONFIRM_MS = 2000;

export function CopyPill({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), CONFIRM_MS);
    return () => window.clearTimeout(timer);
  }, [copied]);

  return (
    <button
      type="button"
      onClick={async () => setCopied(await copyText(value))}
      className={cn(
        "flex h-7 shrink-0 cursor-pointer items-center gap-1 rounded-pill px-3 text-[11px] leading-4 font-semibold transition-colors active:scale-95",
        copied
          ? "bg-jumpa-alt-400 text-jumpa-alt-950"
          : "bg-jumpa-primary-600 text-jumpa-white hover:bg-jumpa-primary-700",
      )}
    >
      {copied ? (
        <CheckIcon className="size-3" />
      ) : (
        <CopyIcon className="size-3" />
      )}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

/** Provider notes — warm rather than alarming, they are instructions not errors. */
export function RampNotes({ notes }: { notes: string[] }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-surface border border-jumpa-warm-200 bg-jumpa-warm-100 px-3 py-2.5">
      {notes.map((note) => (
        <p
          key={note}
          className="flex gap-1.5 text-[11px] leading-4 text-jumpa-warm-700"
        >
          <CircleInformationIcon className="mt-0.5 size-3 shrink-0" />
          <span>{note}</span>
        </p>
      ))}
    </div>
  );
}

export function RampNotice({
  tone,
  children,
}: {
  tone: "error" | "pending";
  children: ReactNode;
}) {
  return (
    <p
      className={cn(
        "rounded-surface px-3 py-2 text-center text-[11px] leading-4 font-medium",
        tone === "error"
          ? "bg-jumpa-danger-50 text-jumpa-danger"
          : "bg-jumpa-warm-100 text-jumpa-warm-700",
      )}
    >
      {children}
    </p>
  );
}
