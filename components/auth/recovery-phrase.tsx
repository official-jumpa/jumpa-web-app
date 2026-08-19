"use client";

import { useState } from "react";
import { CopyButton } from "@/components/auth/copy-button";
import { InfoNote } from "@/components/auth/info-note";
import { SegmentedToggle } from "@/components/auth/segmented-toggle";
import { WordChip, WordGrid } from "@/components/auth/word-chip";
import { Button } from "@/components/ui/button";
import {
  DEMO_RECOVERY_PHRASE,
  PHRASE_LENGTHS,
  type PhraseLength,
} from "@/lib/recovery-phrase";

/** Revealed phrase. "Hide Phrase" blanks the words back to their slot numbers. */
export function RecoveryPhrase({ nextHref }: { nextHref: string }) {
  const [length, setLength] = useState<PhraseLength>("12");
  const [revealed, setRevealed] = useState(true);

  const words = DEMO_RECOVERY_PHRASE.slice(0, Number(length));

  return (
    <>
      <div className="mt-6 flex flex-1 flex-col items-center gap-8">
        <SegmentedToggle
          options={PHRASE_LENGTHS}
          value={length}
          onChange={setLength}
        />

        <WordGrid>
          {words.map((word, index) => (
            <WordChip key={`${index + 1}-${word}`}>
              {index + 1}
              {revealed ? ` ${word}` : ""}
            </WordChip>
          ))}
        </WordGrid>

        <CopyButton
          value={words.join(" ")}
          label="Copy to Clipboard"
          className={revealed ? undefined : "invisible"}
        />

        <InfoNote tone="danger" className="mt-auto max-w-74.75">
          Jumpa can't recover this for you, anyone with the PIN controls the
          account
        </InfoNote>
      </div>

      <div className="mt-8 flex flex-col items-center gap-4.25">
        <Button href={nextHref} variant="gradient" size="lg">
          I've written it down
        </Button>
        <button
          type="button"
          onClick={() => setRevealed((on) => !on)}
          className="text-base leading-4 font-semibold text-jumpa-primary-950"
        >
          {revealed ? "Hide Phrase" : "Reveal Phrase"}
        </button>
      </div>
    </>
  );
}
