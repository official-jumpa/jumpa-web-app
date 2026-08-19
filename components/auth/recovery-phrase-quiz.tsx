"use client";

import { useState } from "react";
import { WordChip, WordGrid } from "@/components/auth/word-chip";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { DEMO_RECOVERY_PHRASE } from "@/lib/recovery-phrase";

/** 1-based slots to fill in, in the order they are asked. */
const QUIZ_SLOTS = [3, 6, 9];
const OPTIONS_PER_ROUND = 8;

/** Confirms the phrase: the grid with `QUIZ_SLOTS` blanked, filled one at a time. */
export function RecoveryPhraseQuiz({ nextHref }: { nextHref: string }) {
  const [round, setRound] = useState(0);
  const words = DEMO_RECOVERY_PHRASE.slice(0, 12);

  const activeSlot = QUIZ_SLOTS[round];
  const done = round >= QUIZ_SLOTS.length;
  const options = words.slice(0, OPTIONS_PER_ROUND);

  const answer = (word: string) => {
    if (word === words[activeSlot - 1]) setRound((n) => n + 1);
  };

  return (
    <>
      <div className="mt-8 flex flex-1 flex-col gap-8">
        <WordGrid>
          {words.map((word, index) => {
            const slot = index + 1;
            const blank = QUIZ_SLOTS.indexOf(slot) >= round;
            return (
              <WordChip key={`${slot}-${word}`}>
                {slot}
                {blank ? "" : ` ${word}`}
              </WordChip>
            );
          })}
        </WordGrid>

        <span className="h-px w-full bg-jumpa-neutral-100" />

        {done ? null : (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm leading-4 font-medium text-jumpa-black">
                Choose the word for slot {activeSlot}
              </p>
              <span className="rounded-pill bg-jumpa-primary-50 px-3 py-1.5 text-xs leading-3.5 font-semibold text-jumpa-primary-950">
                {round + 1}/{QUIZ_SLOTS.length}
              </span>
            </div>

            <div className="grid grid-cols-4 gap-x-2 gap-y-4">
              {options.map((word, index) => (
                <button
                  key={`${index + 1}-${word}`}
                  type="button"
                  onClick={() => answer(word)}
                  className={cn(
                    "flex h-11 items-center justify-center rounded-chip bg-jumpa-neutral-50",
                    "text-sm leading-4 font-medium text-jumpa-black active:bg-jumpa-primary-50",
                  )}
                >
                  {word}
                </button>
              ))}
            </div>
          </div>
        )}

        <p className="max-w-66.75 text-xs leading-3.5 text-jumpa-primary-950">
          Lost your written copy? Go back and reveal the phrase again.
        </p>
      </div>

      <Button
        href={nextHref}
        variant={done ? "gradient" : "soft"}
        size="lg"
        className="mt-8"
        aria-disabled={!done}
      >
        I've written it down
      </Button>
    </>
  );
}
