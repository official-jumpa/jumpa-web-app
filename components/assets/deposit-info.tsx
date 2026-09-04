"use client";

import { useState } from "react";
import { DepositQr } from "@/components/assets/deposit-qr";
import { NetworkSheet } from "@/components/assets/network-sheet";
import { CopyButton } from "@/components/auth/copy-button";
import { ChevronDownIcon } from "@/components/ui/icons/chevron-down";
import { GlobeIcon } from "@/components/ui/icons/globe";
import { UsersIcon } from "@/components/ui/icons/users";
import { ScreenHeader } from "@/components/ui/screen-header";
import type { Chain } from "@/lib/blockchain";
import { depositNotes } from "@/lib/transfer";

/** Renders a note string, turning **word** markers into bold <strong> spans. */
function renderNote(note: string) {
  const parts = note.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) =>
    part.startsWith("**") && part.endsWith("**")
      ? <strong key={i}>{part.slice(2, -2)}</strong>
      : part,
  );
}

/** Where to send funds so they land in this wallet, on the chosen chain. */
export function DepositInfo({
  symbol,
  chains,
  initialChain,
  priceUsd,
}: {
  symbol: string;
  chains: Chain[];
  initialChain: Chain;
  /** Live USD price per 1 unit of symbol, used to compute the minimum deposit. */
  priceUsd: number;
}) {
  const [chain, setChain] = useState(initialChain);
  const [picking, setPicking] = useState(false);

  const switchable = chains.length > 1;
  const isAvailable = !chain.unavailable;


  return (
    <div className="flex min-h-dvh flex-col px-4.5 pt-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
      <ScreenHeader
        back={`/assets/${symbol.toLowerCase()}`}
        title={symbol}
        round
      />

      <h2 className="mt-6 text-base leading-5 font-medium text-jumpa-black">
        Account Information
      </h2>

      <dl className="mt-3 flex flex-col gap-4 rounded-surface bg-jumpa-neutral-50 px-4 py-4">
        {/* The row is a button on multi-chain assets — the address follows it. */}
        <div className="flex items-center gap-3">
          <GlobeIcon
            aria-hidden="true"
            className="size-6 shrink-0 text-jumpa-primary-600"
          />
          <span className="flex min-w-0 flex-1 flex-col">
            <dt className="text-xs leading-4 text-jumpa-neutral-500">
              Network
            </dt>
            <dd className="truncate text-sm leading-4.5 font-medium text-jumpa-black">
              {chain.name}
            </dd>
          </span>
          {switchable ? (
            <button
              type="button"
              onClick={() => setPicking(true)}
              className="tap flex h-8 shrink-0 items-center gap-1 rounded-pill bg-jumpa-white px-3 text-[10px] leading-4 font-semibold text-jumpa-primary-600 active:scale-95"
            >
              Change
              <ChevronDownIcon aria-hidden="true" className="size-4" />
            </button>
          ) : null}
        </div>

        {/* -mb-px: the design draws a zero-height line, a 1px box would add flow. */}
        <span className="-mb-px block h-px w-full bg-jumpa-neutral-100" />

        <div className="flex items-center gap-3">
          <UsersIcon
            aria-hidden="true"
            className="size-6 shrink-0 text-jumpa-primary-600"
          />
          <span className="flex min-w-0 flex-1 flex-col">
            <dt className="text-xs leading-4 text-jumpa-neutral-500">
              Wallet address
            </dt>
            <dd className="truncate text-sm leading-4.5 font-medium text-jumpa-black">
              {chain.address}
            </dd>
          </span>
          {isAvailable && <CopyButton value={chain.address} />}
        </div>
      </dl>

      <div className="mt-4 flex h-73.5 items-center justify-center rounded-surface bg-jumpa-neutral-50">
        {isAvailable ? (
          <DepositQr value={chain.address} />
        ) : (
          <p className="text-sm text-jumpa-neutral-400 text-center px-6">
            This network is not yet available
          </p>
        )}
      </div>

      <h2 className="mt-4 text-sm leading-4.5 font-medium text-jumpa-black">
        Deposit info
      </h2>

      <ul className="mt-3 flex flex-col gap-1 rounded-surface bg-jumpa-primary-50 px-4 py-4 text-xs leading-5 font-medium text-jumpa-black">
        {depositNotes(symbol, chain.name, priceUsd).map((note, i) => (
          <li key={i} className="flex gap-1.5">
            <span aria-hidden="true">&bull;</span>
            <span>{renderNote(note)}</span>
          </li>
        ))}
      </ul>

      {picking ? (
        <NetworkSheet
          symbol={symbol}
          chains={chains}
          selected={chain.id}
          onSelect={(next) => {
            setChain(next);
            setPicking(false);
          }}
          onClose={() => setPicking(false)}
        />
      ) : null}
    </div>
  );
}
