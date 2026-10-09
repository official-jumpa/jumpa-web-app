"use client";

import { useMemo, useState } from "react";
import { Toggle } from "@/components/settings/toggle";
import { Button } from "@/components/ui/button";
import { SheetPortal } from "@/components/ui/sheet-portal";
import { useMomentImage } from "@/hooks/use-moment-image";
import type { SavingsKind } from "@/lib/savings";
import type { HubGoal } from "@/lib/savings-hub";
import {
  type Moment,
  type MomentCard,
  momentCard,
} from "@/lib/savings-moments";
import { CelebrationBurst } from "./celebration-burst";
import { ShareActions } from "./share-actions";
import { ShareCardPreview } from "./share-card-preview";

/**
 * One moment: what was earned, its share card, and where it can go. Opened by
 * an action that earned it (`celebrate`) or from the story to share again.
 * Several moments from one action stay in this one sheet as chips.
 */
export function MomentSheet({
  moments,
  goals,
  celebrate,
  onClose,
  onNextGoal,
}: {
  /** Most important first; the first one leads. */
  moments: Moment[];
  goals: HubGoal[];
  celebrate: boolean;
  onClose: () => void;
  /** A finished plan's prompt: start another of the same kind. */
  onNextGoal: (kind: SavingsKind) => void;
}) {
  const cards = useMemo(
    () =>
      moments
        .map((moment) => momentCard(moment, goals))
        .filter((card): card is MomentCard => card !== null),
    [moments, goals],
  );
  const [index, setIndex] = useState(0);
  const card = cards[index] ?? cards[0];
  if (!card) return null;

  return (
    <SheetPortal onClose={onClose}>
      <MomentBody
        // Keyed per moment, so switching chips lands the next card fresh.
        key={card.key}
        card={card}
        others={cards
          .map((other, at) => ({ other, at }))
          .filter(({ at }) => at !== index)}
        celebrate={celebrate}
        onPick={setIndex}
        onClose={onClose}
        onNextGoal={onNextGoal}
      />
    </SheetPortal>
  );
}

function MomentBody({
  card,
  others,
  celebrate,
  onPick,
  onClose,
  onNextGoal,
}: {
  card: MomentCard;
  others: { other: MomentCard; at: number }[];
  celebrate: boolean;
  onPick: (index: number) => void;
  onClose: () => void;
  onNextGoal: (kind: SavingsKind) => void;
}) {
  // Off by default: a shared card never shows a balance unless asked to.
  const [showAmounts, setShowAmounts] = useState(false);
  const image = useMomentImage(card, showAmounts);
  const burst = celebrate && card.confetti;

  return (
    <div className="flex flex-col items-center gap-5 pt-1 pb-1 text-center">
      <div className="flex flex-col items-center gap-2">
        <span className="rounded-pill bg-jumpa-alt-100 px-2.5 py-1 text-[10px] leading-3 font-semibold tracking-wide text-jumpa-primary-950 uppercase">
          {card.eyebrow}
        </span>
        <h2 className="text-xl leading-6 font-semibold text-jumpa-black">
          {card.headline}
        </h2>
        <p className="max-w-72 text-sm leading-5 text-jumpa-neutral-500">
          {card.detail}
        </p>
      </div>

      <div className="relative flex justify-center">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-1/2 size-48 -translate-x-1/2 -translate-y-1/2 rounded-full bg-jumpa-alt-400/30 blur-3xl"
        />
        {burst ? <CelebrationBurst /> : null}
        <ShareCardPreview
          image={image}
          alt={`${card.headline} — ${card.subject}`}
          land={celebrate}
        />
      </div>

      {others.length ? (
        <div className="flex flex-col items-center gap-2">
          <span className="text-[11px] leading-3.5 text-jumpa-neutral-500">
            Also earned
          </span>
          <div className="flex flex-wrap justify-center gap-2">
            {others.map(({ other, at }) => (
              <button
                key={other.key}
                type="button"
                onClick={() => onPick(at)}
                className="tap rounded-pill bg-jumpa-primary-50 px-3 py-1.5 text-xs leading-4 font-medium text-jumpa-primary-600 active:scale-95"
              >
                {other.short}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {card.amounts ? (
        <div className="flex w-full items-center justify-between gap-3 rounded-panel bg-jumpa-neutral-50 px-4 py-3 text-left">
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="text-sm leading-4 font-medium text-jumpa-black">
              Show amounts on the card
            </span>
            <span className="text-[11px] leading-3.5 text-jumpa-neutral-500">
              Off keeps your balance private
            </span>
          </span>
          <Toggle
            label="Show amounts on the card"
            checked={showAmounts}
            onChange={setShowAmounts}
          />
        </div>
      ) : null}

      <ShareActions card={card} image={image} />

      {card.complete && card.kind ? (
        <Button
          variant="softStrong"
          size="sm"
          onClick={() => card.kind && onNextGoal(card.kind)}
        >
          Start your next goal
        </Button>
      ) : null}

      <button
        type="button"
        onClick={onClose}
        className="tap -mt-1 h-9 px-4 text-sm font-medium text-jumpa-neutral-500 active:scale-95"
      >
        {celebrate ? "Not now" : "Done"}
      </button>
    </div>
  );
}
