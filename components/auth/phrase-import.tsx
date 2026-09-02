"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { validateMnemonic } from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english.js";
import { InfoNote } from "@/components/auth/info-note";
import { SegmentedToggle } from "@/components/ui/segmented-toggle";
import { WordGrid } from "@/components/auth/word-chip";
import { Button } from "@/components/ui/button";
import { PHRASE_LENGTHS, type PhraseLength } from "@/lib/recovery-phrase";

import { authClient } from "@/lib/auth-client";

const ACTION_CLASS =
  "flex h-12 flex-1 items-center justify-center rounded-pill text-sm leading-4 font-medium cursor-pointer";

export function PhraseImport({ nextHref }: { nextHref: string }) {
  const router = useRouter();
  const [length, setLength] = useState<PhraseLength>("12");
  const [words, setWords] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const count = Number(length);
  const wordAt = (slot: number) => words[slot - 1] ?? "";

  const setWord = (slot: number, value: string) => {
    setError(null);
    setWords((current) => {
      const next = [...current];
      next[slot - 1] = value.trim().toLowerCase();
      return next;
    });
  };

  const pasteAll = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const split = text.trim().toLowerCase().split(/\s+/).slice(0, count);
      setWords(split);
      setError(null);
    } catch {
      // Permission denied
    }
  };

  const handleContinue = async () => {
    const filledWords = Array.from(
      { length: count },
      (_, i) => words[i] ?? "",
    ).filter(Boolean);
    if (filledWords.length !== count) {
      setError(`Please enter all ${count} words of your seed phrase`);
      return;
    }

    const fullPhrase = filledWords.join(" ");
    if (!validateMnemonic(fullPhrase, wordlist)) {
      setError("Invalid seed phrase. Please check word spelling and order.");
      return;
    }

    setLoading(true);
    try {
      const session = await authClient.getSession();
      if (!session?.data?.user) {
        const anonRes = await authClient.signIn.anonymous();
        if (anonRes?.error) {
          setError(anonRes.error.message || "Failed to initialize session");
          setLoading(false);
          return;
        }
      }

      if (typeof window !== "undefined") {
        sessionStorage.removeItem("setupPrivateKey");
        sessionStorage.removeItem("setupChain");
        sessionStorage.setItem("setupPhrase", fullPhrase);
        sessionStorage.setItem("setupType", "phrase");
      }

      router.push(nextHref);
    } catch (err: any) {
      setError(err?.message || "Failed to proceed. Please try again.");
    } finally {
      setLoading(false);
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
                className="flex h-11 min-w-0 items-center justify-center gap-1 overflow-hidden rounded-chip border border-transparent bg-jumpa-neutral-50 px-1.5 text-sm leading-4 font-medium text-jumpa-black focus-within:border-jumpa-primary-300 focus-within:bg-jumpa-primary-50"
              >
                <span className="shrink-0 text-jumpa-primary-950">{slot}</span>
                <input
                  value={wordAt(slot)}
                  onChange={(event) => setWord(slot, event.target.value)}
                  aria-label={`Word ${slot}`}
                  autoComplete="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  // Sizing to the word keeps it centred with the slot number, but it
                  // has to stay inside the cell — an overlong word widened the grid.
                  style={{
                    width: `min(${Math.max(wordAt(slot).length, 1)}ch, 100%)`,
                  }}
                  className="min-w-0 bg-transparent outline-none"
                />
              </label>
            ),
          )}
        </WordGrid>

        {error && (
          <p className="text-center text-xs text-jumpa-danger px-2">{error}</p>
        )}

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
            onClick={() => {
              setWords([]);
              setError(null);
            }}
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

      <Button
        type="button"
        onClick={handleContinue}
        variant="gradient"
        size="lg"
        className="mt-8 cursor-pointer"
      >
        Continue
      </Button>
    </>
  );
}
