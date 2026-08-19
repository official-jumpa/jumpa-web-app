"use client";

import { useEffect, useState } from "react";
import { CopyIcon } from "@/components/ui/icons/copy";
import { cn } from "@/lib/cn";

const CONFIRM_MS = 2000;

/** Copies `value` to the clipboard and confirms in place. */
export function CopyButton({
  value,
  label,
  className,
}: {
  value: string;
  /** Shown beside the icon; omit for the icon-only form. */
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), CONFIRM_MS);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {
      // Access can be denied; leave the label untouched.
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={label ? undefined : "Copy"}
      className={cn(
        "flex items-center justify-center gap-2 text-jumpa-primary-950",
        label && "rounded-pill bg-jumpa-primary-50 px-5.5 py-2.5",
        className,
      )}
    >
      <CopyIcon className="size-6 shrink-0" />
      {label ? (
        <span className="text-sm leading-4 font-medium">
          {copied ? "Copied" : label}
        </span>
      ) : null}
    </button>
  );
}
