"use client";

import { useState } from "react";
import { CardKindRow } from "@/components/cards/card-kind-row";
import { CardPinSheet } from "@/components/cards/card-pin-sheet";
import { Button } from "@/components/ui/button";
import { ScreenHeader } from "@/components/ui/screen-header";
import {
  CARD_CATEGORIES,
  CARD_KINDS,
  type CardCategory,
  type CardKind,
  NEW_CARD_PIN,
} from "@/lib/cards";
import { cn } from "@/lib/cn";

/** Card type chooser. Continue issues the card and reveals its PIN. */
export function CreateCardView() {
  const [category, setCategory] = useState<CardCategory>("debit");
  const [kind, setKind] = useState<CardKind>("virtual");
  const [issued, setIssued] = useState(false);

  return (
    <div className="flex min-h-dvh flex-col px-4.5 pt-[calc(env(safe-area-inset-top)+1.5rem)] pb-[calc(env(safe-area-inset-bottom)+2.5rem)]">
      <ScreenHeader back="/cards/new" title="Create Your Cards" round />

      <div className="mt-6 flex gap-1">
        {CARD_CATEGORIES.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={option.value === category}
            onClick={() => setCategory(option.value)}
            className={cn(
              "tap rounded-pill px-3.5 py-3 text-xs leading-3.5 font-semibold text-jumpa-primary-950 active:scale-95",
              option.value === category && "bg-jumpa-primary-50",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="mt-6 flex flex-col gap-2">
        {CARD_KINDS.map((option) => (
          <CardKindRow
            key={option.kind}
            title={option.title}
            blurb={option.blurb}
            selected={option.kind === kind}
            onSelect={() => setKind(option.kind)}
          />
        ))}
      </div>

      <Button
        variant="gradient"
        size="lg"
        className="mt-12"
        onClick={() => setIssued(true)}
      >
        Continue
      </Button>

      {issued ? (
        <CardPinSheet pin={NEW_CARD_PIN} onClose={() => setIssued(false)} />
      ) : null}
    </div>
  );
}
