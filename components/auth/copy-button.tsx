"use client";

import { useEffect, useState } from "react";
import { CheckIcon } from "@/components/ui/icons/check";
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
      return;
    } catch {
      // navigator.clipboard needs a secure context — absent when the app is
      // opened over plain http on a phone, which is how this gets tested.
    }

    const scratch = document.createElement("textarea");
    scratch.value = value;
    scratch.setAttribute("readonly", "");
    scratch.style.position = "fixed";
    scratch.style.opacity = "0";
    document.body.append(scratch);
    scratch.select();
    try {
      setCopied(document.execCommand("copy"));
    } catch {
      // Nothing else to try; leave the button untouched.
    }
    scratch.remove();
  };

  const Icon = copied ? CheckIcon : CopyIcon;

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={label ? undefined : copied ? "Copied" : "Copy"}
      className={cn(
        "flex items-center justify-center gap-2 transition-colors",
        copied ? "text-jumpa-success" : "text-jumpa-primary-950",
        label && "rounded-pill bg-jumpa-primary-50 px-5.5 py-2.5",
        className,
      )}
    >
      <Icon className="size-6 shrink-0" />
      {label ? (
        <span className="text-sm leading-4 font-medium">
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
