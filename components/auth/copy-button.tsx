"use client";

import { useEffect, useState } from "react";
import { CheckIcon } from "@/components/ui/icons/check";
import { CopyIcon } from "@/components/ui/icons/copy";
import { copyText } from "@/lib/clipboard";
import { cn } from "@/lib/cn";

const CONFIRM_MS = 2000;

const PILL_LABEL = "text-sm leading-4 font-medium";
const CHIP_LABEL = "text-[10px] leading-4";

/** Copies `value` to the clipboard and confirms in place. */
export function CopyButton({
  value,
  label,
  name,
  variant = "pill",
  className,
}: {
  value: string;
  /** Shown beside the icon; omit for the icon-only form. */
  label?: string;
  /** Accessible name for the icon-only form, when "Copy" alone is ambiguous. */
  name?: string;
  /** `text` drops the pill and the icon; `chip` is the small purple tag the
   *  payment instructions draw. */
  variant?: "pill" | "text" | "chip";
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), CONFIRM_MS);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const copy = async () => {
    setCopied(await copyText(value));
  };

  const Icon = copied ? CheckIcon : CopyIcon;
  const bare = variant === "text";
  const chip = variant === "chip";
  const chipTone = copied
    ? "bg-jumpa-success text-jumpa-white"
    : "bg-jumpa-primary-525 text-jumpa-primary-50";

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={label ? undefined : copied ? "Copied" : (name ?? "Copy")}
      className={cn(
        "flex items-center justify-center gap-2 transition-colors",
        chip && `h-4.5 shrink-0 rounded-xl px-2.5 ${chipTone}`,
        !chip && (copied ? "text-jumpa-success" : "text-jumpa-primary-950"),
        label && !bare && !chip && "rounded-pill bg-jumpa-primary-50 px-5.5 py-2.5",
        className,
      )}
    >
      {bare || chip ? null : <Icon className="size-6 shrink-0" />}
      {label ? (
        <span className={chip ? CHIP_LABEL : bare ? undefined : PILL_LABEL}>
          {copied ? "Copied" : label}
        </span>
      ) : null}
      {/* Announces the change for the icon-only form, which has no visible text. */}
      <span aria-live="polite" className="sr-only">
        {copied ? "Copied to clipboard" : ""}
      </span>
    </button>
  );
}
