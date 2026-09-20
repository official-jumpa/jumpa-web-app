"use client";

import { useEffect, useState } from "react";
import { CheckIcon } from "@/components/ui/icons/check";
import { CopyIcon } from "@/components/ui/icons/copy";
import { copyText } from "@/lib/clipboard";

const CONFIRM_MS = 2000;

/** EVM, Stellar and base58 (Solana, TRON) — the strings worth a copy control. */
const ADDRESS_BODY =
  "0x[a-fA-F0-9]{40}|G[A-Z2-7]{55}|[1-9A-HJ-NP-Za-km-z]{32,44}";
const ADDRESS_RUN = new RegExp(`\\b(?:${ADDRESS_BODY})\\b`, "g");
const ADDRESS_ONLY = new RegExp(`^(?:${ADDRESS_BODY})$`);

export type TextChunk = { text: string; address: boolean };

export function isAddress(text: string): boolean {
  return ADDRESS_ONLY.test(text);
}

/** Splits a run of copy so each address in it can be rendered as its own chip. */
export function splitAddresses(text: string): TextChunk[] {
  const chunks: TextChunk[] = [];
  let last = 0;

  for (const match of text.matchAll(ADDRESS_RUN)) {
    const start = match.index ?? 0;
    if (start > last) {
      chunks.push({ text: text.slice(last, start), address: false });
    }
    chunks.push({ text: match[0], address: true });
    last = start + match[0].length;
  }

  if (last < text.length) {
    chunks.push({ text: text.slice(last), address: false });
  }
  return chunks;
}

/**
 * An address in the transcript: tap it to copy, and it wraps inside its own box
 * instead of running off the bubble. It is a full-width block on purpose — a
 * 44-character string cannot break across the lines of the sentence around it,
 * which is what used to push it past the right edge.
 */
export function CopyableAddress({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), CONFIRM_MS);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const Icon = copied ? CheckIcon : CopyIcon;

  return (
    <button
      type="button"
      onClick={async () => setCopied(await copyText(value))}
      aria-label={copied ? "Address copied" : `Copy address ${value}`}
      className={`tap my-1 flex w-full max-w-full items-start gap-1.5 rounded-lg px-2 py-1.5 text-left active:scale-[0.99] ${
        copied
          ? "bg-jumpa-success/10 text-jumpa-success"
          : "bg-jumpa-primary-50 text-jumpa-primary-950"
      }`}
    >
      {/* No size or face of its own — it inherits the bubble's, so an address
          reads as the bold run it was before the chip existed. */}
      <span className="min-w-0 flex-1 font-bold break-all wrap-anywhere">
        {value}
      </span>
      {/* Centred on the first line: (22px leading - 16px icon) / 2. */}
      <Icon aria-hidden="true" className="size-4 shrink-0 translate-y-0.75" />
      <span aria-live="polite" className="sr-only">
        {copied ? "Copied to clipboard" : ""}
      </span>
    </button>
  );
}
