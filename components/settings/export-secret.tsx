"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CopyButton } from "@/components/auth/copy-button";
import { InfoNote } from "@/components/auth/info-note";
import { WordChip, WordGrid } from "@/components/auth/word-chip";
import { settingsHref } from "@/components/settings/sections";
import { SettingsHeader } from "@/components/settings/settings-header";
import { TransferPinSheet } from "@/components/transfer/transfer-pin-sheet";
import { Button } from "@/components/ui/button";
import { CheckIcon } from "@/components/ui/icons/check";
import { EyeIcon } from "@/components/ui/icons/eye";
import { EyeOffIcon } from "@/components/ui/icons/eye-off";
import { ResultSheet } from "@/components/ui/result-sheet";
import { getAssetLogo } from "@/lib/assets";
import {
  EXPORT_CHAINS,
  EXPORT_COPY,
  EXPORT_WARNING,
  type ExportChainId,
  type ExportKind,
  SECRET_MASK,
} from "@/lib/export-secret";

/** Stands in for the words until the PIN unlocks them. */
const LOCKED_WORDS = Array.from({ length: 12 }, () => "••••");

const SECURITY = settingsHref("security");

/**
 * Export Private Key and Export Seed Phrase.
 * For private keys, user chooses the chain before verifying with PIN.
 */
export function ExportSecret({ kind }: { kind: ExportKind }) {
  const router = useRouter();
  const copy = EXPORT_COPY[kind];

  const [selectedChain, setSelectedChain] = useState<ExportChainId>("stellar");
  const [showPinSheet, setShowPinSheet] = useState(kind === "seed-phrase");
  const [secret, setSecret] = useState<string>();
  const [activeExportedChain, setActiveExportedChain] =
    useState<ExportChainId>("stellar");
  const [revealed, setRevealed] = useState(false);
  const [checking, setChecking] = useState(false);
  const [wrongPin, setWrongPin] = useState(false);
  const [problem, setProblem] = useState<string>();

  const currentChainConfig =
    EXPORT_CHAINS.find((c) => c.id === selectedChain) ?? EXPORT_CHAINS[0];
  const activeChainConfig =
    EXPORT_CHAINS.find((c) => c.id === activeExportedChain) ?? EXPORT_CHAINS[0];

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
      const targetChain = kind === "seed-phrase" ? "phrase" : selectedChain;

      const res = await fetch("/api/wallet/export-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: wallet.address,
          pin,
          chain: targetChain,
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
      setActiveExportedChain(selectedChain);
      setShowPinSheet(false);
      setRevealed(false);
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
      ) : !secret ? (
        /* Chain Selection Phase */
        <section className="mt-7">
          <h2 className="text-sm leading-4.5 font-medium text-jumpa-black">
            Select Network
          </h2>
          <p className="mt-1 text-xs leading-4 text-jumpa-neutral-600">
            Choose the blockchain network for the private key you wish to export.
          </p>

          <ul className="mt-4 flex flex-col gap-2.5">
            {EXPORT_CHAINS.map((chain) => {
              const active = chain.id === selectedChain;
              return (
                <li key={chain.id}>
                  <button
                    type="button"
                    aria-pressed={active}
                    onClick={() => setSelectedChain(chain.id)}
                    className={`tap flex w-full items-center gap-3 rounded-panel border p-3.5 text-left transition-all active:scale-[0.99] ${
                      active
                        ? "border-jumpa-primary-600 bg-jumpa-primary-50/70 shadow-sm"
                        : "border-jumpa-neutral-75 bg-jumpa-neutral-50 hover:bg-jumpa-neutral-100"
                    }`}
                  >
                    <Image
                      src={getAssetLogo(chain.name)}
                      alt=""
                      width={36}
                      height={36}
                      className="size-9 shrink-0 rounded-full object-contain"
                    />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-sm leading-5 font-semibold text-jumpa-black">
                        {chain.name}{" "}
                        <span className="text-xs font-normal text-jumpa-neutral-600">
                          ({chain.symbol})
                        </span>
                      </span>
                    </span>
                    {active ? (
                      <span className="flex size-5.5 shrink-0 items-center justify-center rounded-full bg-jumpa-primary-600 text-white shadow-xs">
                        <CheckIcon className="size-3.5" />
                      </span>
                    ) : (
                      <span className="size-5.5 shrink-0 rounded-full border border-jumpa-neutral-200" />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>

          <Button
            variant="gradient"
            size="lg"
            className="mt-6 w-full"
            onClick={() => {
              setWrongPin(false);
              setShowPinSheet(true);
            }}
          >
            Export {currentChainConfig.name} Key
          </Button>
        </section>
      ) : (
        /* Revealed Key Phase */
        <section className="mt-7">
          <div className="flex items-center justify-between">
            <h2 className="text-sm leading-4.5 font-medium text-jumpa-black">
              Private Key
            </h2>
            <div className="flex items-center gap-1.5 rounded-full bg-jumpa-primary-50 px-2.5 py-1 text-xs font-medium text-jumpa-primary-950">
              <Image
                src={getAssetLogo(activeChainConfig.name)}
                alt=""
                width={14}
                height={14}
                className="size-3.5 rounded-full object-contain"
              />
              <span>{activeChainConfig.badge}</span>
            </div>
          </div>

          <div className="mt-3 flex min-h-25.5 items-center gap-2 rounded-panel border border-jumpa-neutral-75 bg-jumpa-neutral-50 py-5.75 pr-8.5 pl-6">
            <p className="min-w-0 flex-1 break-all text-[11px] leading-4 font-mono font-medium text-jumpa-black">
              {revealed ? secret : SECRET_MASK}
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

          <div className="mt-4 flex flex-col items-center gap-3">
            <CopyButton
              value={secret}
              label="Copy to Clipboard"
              className="mx-auto"
            />
            <button
              type="button"
              onClick={() => {
                setSecret(undefined);
                setRevealed(false);
              }}
              className="tap text-xs font-medium text-jumpa-primary-600 hover:underline"
            >
              Export a key for a different network
            </button>
          </div>
        </section>
      )}

      {secret && kind === "seed-phrase" ? (
        <CopyButton
          value={secret}
          label="Copy to Clipboard"
          className="mx-auto mt-8"
        />
      ) : null}

      <InfoNote tone="danger" className="mt-auto pt-10">
        {EXPORT_WARNING}
      </InfoNote>

      {/* Continue navigates back to Security Settings */}
      <Button
        variant={secret ? "gradient" : "softStrong"}
        size="lg"
        className="mt-6"
        onClick={() => router.replace(SECURITY)}
      >
        {secret ? "Done" : "Cancel"}
      </Button>

      {showPinSheet && !secret && !problem ? (
        <TransferPinSheet
          error={wrongPin}
          pending={checking}
          pendingLabel="Verifying your PIN"
          onComplete={unlock}
          onRetry={() => setWrongPin(false)}
          onClose={() => {
            setShowPinSheet(false);
            if (kind === "seed-phrase") {
              router.replace(SECURITY);
            }
          }}
        />
      ) : null}

      {problem ? (
        <ResultSheet
          title="That didn't go through"
          message={problem}
          onClose={() => {
            setProblem(undefined);
            setShowPinSheet(false);
            if (kind === "seed-phrase") {
              router.replace(SECURITY);
            }
          }}
        />
      ) : null}
    </div>
  );
}
