"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CopyButton } from "@/components/auth/copy-button";
import { InfoNote } from "@/components/auth/info-note";
import { WordChip, WordGrid } from "@/components/auth/word-chip";
import { settingsHref } from "@/components/settings/sections";
import { SettingsHeader } from "@/components/settings/settings-header";
import { TransferPinSheet } from "@/components/transfer/transfer-pin-sheet";
import { Button } from "@/components/ui/button";
import { EyeIcon } from "@/components/ui/icons/eye";
import { EyeOffIcon } from "@/components/ui/icons/eye-off";
import { ResultSheet } from "@/components/ui/result-sheet";
import {
  EXPORT_COPY,
  EXPORT_WARNING,
  type ExportKind,
  SECRET_MASK,
} from "@/lib/export-secret";

/** Stands in for the words until the PIN unlocks them. */
const LOCKED_WORDS = Array.from({ length: 12 }, () => "••••");

const SECURITY = settingsHref("security");

/**
 * Export Private Key and Export Seed Phrase. Nothing is on screen until the
 * transaction PIN comes back from the server, which is also what decrypts it —
 * the mask is the real state, not a cover over a value the page already holds.
 */
export function ExportSecret({ kind }: { kind: ExportKind }) {
  const router = useRouter();
  const copy = EXPORT_COPY[kind];

  const [secret, setSecret] = useState<string>();
  const [revealed, setRevealed] = useState(false);
  const [checking, setChecking] = useState(false);
  const [wrongPin, setWrongPin] = useState(false);
  const [problem, setProblem] = useState<string>();

  const unlock = async (pin: string) => {
    setChecking(true);
    try {
      const list = await fetch("/api/wallet/list");
      const wallets = await list.json();
      if (!Array.isArray(wallets) || wallets.length === 0) {
        setProblem("We couldn't find your wallet. Sign in again and retry.");
        return;
      }

      const wallet = wallets.find((w) => w.isSelected) ?? wallets[0];
      const res = await fetch("/api/wallet/export-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: wallet.address,
          pin,
          chain: copy.chain,
        }),
      });
      const data = await res.json();

      // The route answers 401 for a bad PIN and for a dead session alike.
      if (data?.error === "Incorrect PIN") {
        setWrongPin(true);
        return;
      }
      if (!res.ok) {
        setProblem(
          "We couldn't unlock your wallet just now. Try again in a moment.",
        );
        return;
      }

      setSecret(kind === "seed-phrase" ? data.phrase : data.privateKey);
    } catch (err) {
      console.error("[ExportSecret] Export failed:", err);
      setProblem("Check your connection and try again.");
    } finally {
      setChecking(false);
    }
  };

  const words = secret ? secret.trim().split(/\s+/) : LOCKED_WORDS;
  const ToggleIcon = revealed ? EyeOffIcon : EyeIcon;

  return (
    <div className="flex min-h-dvh flex-col px-4.5 pt-[calc(env(safe-area-inset-top)+21px)] pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
      <SettingsHeader back={SECURITY} title={copy.bar} />

      <h1 className="mt-8.5 text-[28px] leading-8 font-semibold text-jumpa-black">
        {copy.heading}
      </h1>
      <p className="mt-2 text-sm leading-4.5 text-jumpa-neutral-700">
        {copy.lead}
        <strong className="font-semibold text-jumpa-black">
          {copy.strong}
        </strong>
        {copy.tail}
      </p>

      {kind === "seed-phrase" ? (
        <div className="mt-9">
          <WordGrid>
            {words.map((word, index) => (
              <WordChip key={`${index + 1}-${word}`}>
                <span className="truncate">
                  {index + 1} {word}
                </span>
              </WordChip>
            ))}
          </WordGrid>
        </div>
      ) : (
        <section className="mt-7">
          <h2 className="text-sm leading-4.5 font-medium text-jumpa-black">
            Private Key
          </h2>
          <div className="mt-3 flex min-h-25.5 items-center gap-2 rounded-panel border border-jumpa-neutral-75 bg-jumpa-neutral-50 py-5.75 pr-8.5 pl-6">
            <p className="min-w-0 flex-1 break-all text-[10px] leading-3 font-medium text-jumpa-black">
              {secret && revealed ? secret : SECRET_MASK}
            </p>
            <button
              type="button"
              disabled={!secret}
              onClick={() => setRevealed((on) => !on)}
              aria-label={revealed ? "Hide private key" : "Show private key"}
              className="tap shrink-0 text-jumpa-black active:scale-95 disabled:opacity-40"
            >
              <ToggleIcon className="size-6" />
            </button>
          </div>
        </section>
      )}

      {secret ? (
        <CopyButton
          value={secret}
          label="Copy to Clipboard"
          className="mx-auto mt-8"
        />
      ) : null}

      <InfoNote tone="danger" className="mt-auto pt-10">
        {EXPORT_WARNING}
      </InfoNote>

      {/* The design draws no screen after Continue; it leaves the flow. */}
      <Button
        variant="gradient"
        size="lg"
        className="mt-6"
        onClick={() => router.replace(SECURITY)}
      >
        Continue
      </Button>

      {!secret && !problem ? (
        <TransferPinSheet
          error={wrongPin}
          pending={checking}
          pendingLabel="Checking your PIN"
          onComplete={unlock}
          onRetry={() => setWrongPin(false)}
          onClose={() => router.replace(SECURITY)}
        />
      ) : null}

      {problem ? (
        <ResultSheet
          title="That didn't go through"
          message={problem}
          onClose={() => {
            setProblem(undefined);
            router.replace(SECURITY);
          }}
        />
      ) : null}
    </div>
  );
}
