"use client";

import { useState } from "react";
import { InfoNote } from "@/components/auth/info-note";
import { SegmentedToggle } from "@/components/auth/segmented-toggle";
import { WordGrid } from "@/components/auth/word-chip";
import { Button } from "@/components/ui/button";
import { PHRASE_LENGTHS, type PhraseLength } from "@/lib/recovery-phrase";

const ACTION_CLASS =
  "flex h-12 flex-1 items-center justify-center rounded-pill text-sm leading-4 font-medium";

/** Recovery phrase entry. Nothing validates the words yet. */
export function PhraseImport({ nextHref }: { nextHref: string }) {
  const [length, setLength] = useState<PhraseLength>("12");
  const [words, setWords] = useState<string[]>([]);

  const count = Number(length);
  const wordAt = (slot: number) => words[slot - 1] ?? "";

  const setWord = (slot: number, value: string) =>
    setWords((current) => {
      const next = [...current];
      next[slot - 1] = value.trim();
      return next;
    });

  const pasteAll = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setWords(text.trim().split(/\s+/).slice(0, count));
    } catch {
      // Clipboard reads need permission; leave the grid as it is.
    }
  };

  return (
    <>
      <div className="mt-6 flex flex-1 flex-col items-center gap-8">
        <SegmentedToggle
          options={PHRASE_LENGTHS}
          value={length}
          onChange={setLength}
        />

        <WordGrid>
          {Array.from({ length: count }, (_, index) => index + 1).map(
            (slot) => (
              <label
                key={slot}
                className="flex h-11 items-center justify-center gap-1 rounded-chip border border-transparent bg-jumpa-neutral-50 text-sm leading-4 font-medium text-jumpa-black focus-within:border-jumpa-primary-300 focus-within:bg-jumpa-primary-50"
              >
                <span className="text-jumpa-primary-950">{slot}</span>
                <input
                  value={wordAt(slot)}
                  onChange={(event) => setWord(slot, event.target.value)}
                  aria-label={`Word ${slot}`}
                  autoComplete="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  // Sized from its own value so the pair stays centred when empty.
                  style={{ width: `${Math.max(wordAt(slot).length, 1)}ch` }}
                  className="bg-transparent outline-none"
                />
              </label>
            ),
          )}
        </WordGrid>

        <div className="flex w-full gap-2">
          <button
            type="button"
            onClick={pasteAll}
            className={`${ACTION_CLASS} bg-jumpa-primary-100 text-jumpa-primary-950`}
          >
            Paste All
          </button>
          <button
            type="button"
            onClick={() => setWords([])}
            className={`${ACTION_CLASS} border border-jumpa-primary-100 text-jumpa-primary-950`}
          >
            Clear All
          </button>
        </div>

        <InfoNote tone="brand" className="mt-auto max-w-74.75">
          Jumpa can't recover this for you, anyone with the PIN controls the
          account
        </InfoNote>
      </div>

      <Button href={nextHref} variant="gradient" size="lg" className="mt-8">
        Continue
      </Button>
    </>
  );
}
