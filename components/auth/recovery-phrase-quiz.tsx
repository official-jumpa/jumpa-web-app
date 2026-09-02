"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { WordChip, WordGrid } from "@/components/auth/word-chip";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
import { cn } from "@/lib/cn";

/** 1-based slots to verify in the quiz */
const QUIZ_SLOTS = [3, 6, 9];

export function RecoveryPhraseQuiz({ nextHref }: { nextHref: string }) {
  const router = useRouter();
  const [words, setWords] = useState<string[]>([]);
  const [round, setRound] = useState(0);
  const [quizError, setQuizError] = useState<string | null>(null);
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = sessionStorage.getItem("setupPhrase");
      if (stored) {
        setWords(stored.trim().split(/\s+/));
      }
    }
  }, []);

  const activeSlot = QUIZ_SLOTS[round];
  const done = round >= QUIZ_SLOTS.length;

  // Generate 8 candidate options containing the correct answer + other words from the seed phrase
  const options = useMemo(() => {
    if (!words.length || done || !activeSlot) return [];
    const correctWord = words[activeSlot - 1];

    // Pick other words from phrase as options
    const otherWords = words.filter((w) => w !== correctWord);
    const shuffledOthers = [...otherWords]
      .sort(() => 0.5 - Math.random())
      .slice(0, 7);

    return [...shuffledOthers, correctWord].sort(() => 0.5 - Math.random());
  }, [words, activeSlot, done]);

  const handleAnswer = (selectedWord: string) => {
    if (!words.length || done) return;
    const correctWord = words[activeSlot - 1];

    if (selectedWord === correctWord) {
      setQuizError(null);
      setError(undefined);
      setRound((n) => n + 1);
    } else {
      setQuizError("Incorrect word. Please check your backup and try again.");
    }
  };

  return (
    <>
      <div className="mt-8 flex flex-1 flex-col gap-8">
        <WordGrid>
          {words.map((word, index) => {
            const slot = index + 1;
            const isQuizSlot = QUIZ_SLOTS.includes(slot);
            const slotRoundIndex = QUIZ_SLOTS.indexOf(slot);
            const blank = isQuizSlot && slotRoundIndex >= round;

            return (
              <WordChip key={`${slot}-${word}`}>
                {slot}
                {blank ? "" : ` ${word}`}
              </WordChip>
            );
          })}
        </WordGrid>

        <span className="h-px w-full bg-jumpa-neutral-100" />

        {done ? (
          <div className="flex flex-col items-center gap-2 text-center text-jumpa-primary-950 font-medium text-sm">
            Seed phrase verified!
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm leading-4 font-medium text-jumpa-black">
                Choose the word for slot #{activeSlot}
              </p>
              <span className="rounded-pill bg-jumpa-primary-50 px-3 py-1.5 text-xs leading-3.5 font-semibold text-jumpa-primary-950">
                {round + 1}/{QUIZ_SLOTS.length}
              </span>
            </div>

            <FieldError>{quizError ?? undefined}</FieldError>

            <div className="grid grid-cols-4 gap-x-2 gap-y-4">
              {options.map((word, index) => (
                <button
                  key={`${index + 1}-${word}`}
                  type="button"
                  onClick={() => handleAnswer(word)}
                  className={cn(
                    "flex h-11 items-center justify-center rounded-chip bg-jumpa-neutral-50 cursor-pointer",
                    "text-sm leading-4 font-medium text-jumpa-black active:bg-jumpa-primary-50 hover:bg-jumpa-primary-100 transition-colors",
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

      <div className="mt-8 flex flex-col items-center gap-3">
        <FieldError>{error}</FieldError>
        <Button
          type="button"
          variant={done ? "gradient" : "soft"}
          size="lg"
          className="cursor-pointer"
          onClick={() =>
            done
              ? router.push(nextHref)
              : setError("Pick the right word for each slot to continue.")
          }
        >
          I've written it down
        </Button>
      </div>
    </>
  );
}
