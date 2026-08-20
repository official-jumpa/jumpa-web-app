"use client";

import { useEffect, useState } from "react";
import { CopyButton } from "@/components/auth/copy-button";
import { InfoNote } from "@/components/auth/info-note";
import { WordChip, WordGrid } from "@/components/auth/word-chip";
import { Button } from "@/components/ui/button";

/** Revealed phrase for wallet. Always displays 12 words without length toggle. */
export function RecoveryPhrase({ nextHref }: { nextHref: string }) {
  const [revealed, setRevealed] = useState(true);
  const [generatedPhrase, setGeneratedPhrase] = useState<string>("");

  useEffect(() => {
    const existing =
      typeof window !== "undefined"
        ? sessionStorage.getItem("setupPhrase")
        : null;

    if (existing) {
      setGeneratedPhrase(existing);
    } else {
      fetch("/api/wallet/generate-phrase")
        .then((res) => res.json())
        .then((data) => {
          if (data.phrase) {
            setGeneratedPhrase(data.phrase);
            if (typeof window !== "undefined") {
              sessionStorage.setItem("setupPhrase", data.phrase);
            }
          }
        })
        .catch((err) =>
          console.error("[RecoveryPhrase] Error generating phrase:", err),
        );
    }
  }, []);

  const words = generatedPhrase ? generatedPhrase.split(" ") : [];

  return (
    <>
      <div className="mt-6 flex flex-1 flex-col items-center gap-8">
        <WordGrid>
          {words.length > 0
            ? words.map((word, index) => (
                <WordChip key={`${index + 1}-${word}`}>
                  {index + 1}
                  {revealed ? ` ${word}` : ""}
                </WordChip>
              ))
            : Array.from({ length: 12 }).map((_, index) => (
                <WordChip key={index + 1}>
                  {index + 1} {revealed ? "..." : ""}
                </WordChip>
              ))}
        </WordGrid>

        <CopyButton
          value={words.join(" ")}
          label="Copy to Clipboard"
          className={revealed && words.length > 0 ? undefined : "invisible"}
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
          className="text-base leading-4 font-semibold text-jumpa-primary-950 cursor-pointer"
        >
          {revealed ? "Hide Phrase" : "Reveal Phrase"}
        </button>
      </div>
    </>
  );
}
