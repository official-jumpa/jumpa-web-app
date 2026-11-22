"use client";

import { useEffect, useRef, useState } from "react";
import { ChainIcon } from "@/components/ui/icons/chain";
import { copyText } from "@/lib/clipboard";
import { REFERRAL_CHALLENGE } from "@/lib/landing";

const RESET_MS = 2000;

/** Copies the signed-in visitor's referral link; the label confirms in place. */
export function CopyLinkButton({
  link,
  className,
}: {
  link: string;
  className: string;
}) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = async () => {
    const copied = await copyText(link);
    setState(copied ? "copied" : "failed");
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setState("idle"), RESET_MS);
  };

  const { copyLink } = REFERRAL_CHALLENGE;
  const label =
    state === "copied"
      ? copyLink.copied
      : state === "failed"
        ? copyLink.failed
        : copyLink.label;

  return (
    <button type="button" onClick={copy} className={className}>
      <ChainIcon className="size-16 shrink-0 md:size-18" />
      <span aria-live="polite">{label}</span>
    </button>
  );
}
