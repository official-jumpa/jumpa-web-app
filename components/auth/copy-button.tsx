"use client";

import { useEffect, useState } from "react";
import { CheckIcon } from "@/components/ui/icons/check";
import { CopyIcon } from "@/components/ui/icons/copy";
import { copyText } from "@/lib/clipboard";
import { cn } from "@/lib/cn";

const CONFIRM_MS = 2000;

/** Copies `value` to the clipboard and confirms in place. */
export function CopyButton({
  value,
  label,
  variant = "pill",
  className,
}: {
  value: string;
  /** Shown beside the icon; omit for the icon-only form. */
  label?: string;
  /** `text` drops the pill and the icon, leaving the label alone. */
  variant?: "pill" | "text";
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

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={label ? undefined : copied ? "Copied" : "Copy"}
      className={cn(
        "flex items-center justify-center gap-2 transition-colors",
        copied ? "text-jumpa-success" : "text-jumpa-primary-950",
        label && !bare && "rounded-pill bg-jumpa-primary-50 px-5.5 py-2.5",
        className,
      )}
    >
      {bare ? null : <Icon className="size-6 shrink-0" />}
      {label ? (
        <span className={bare ? undefined : "text-sm leading-4 font-medium"}>
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
