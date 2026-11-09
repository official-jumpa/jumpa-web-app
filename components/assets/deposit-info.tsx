"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DepositDetails } from "@/components/assets/deposit-details";
import { NetworkSheet } from "@/components/assets/network-sheet";
import { ChevronDownIcon } from "@/components/ui/icons/chevron-down";
import { ScreenHeader } from "@/components/ui/screen-header";
import type { Chain } from "@/lib/blockchain";
import { depositNotes } from "@/lib/transfer";

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
  const router = useRouter();
  const [chain, setChain] = useState(initialChain);
  const [picking, setPicking] = useState(false);

  useEffect(() => {
    setChain(initialChain);
  }, [initialChain]);

  const switchable = chains.length > 1;
  const isAvailable = !chain.unavailable;


  return (
    <div className="flex min-h-dvh flex-col px-4.5 pt-[calc(env(safe-area-inset-top)+1.5rem)] pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
      <ScreenHeader
        back={`/assets?token=${symbol.toLowerCase()}&network=${chain.id}`}
        title={symbol}
        round
      />

      <DepositDetails
        network={chain.name}
        address={chain.address}
        notes={depositNotes(symbol, chain.name, priceUsd)}
        available={isAvailable}
        networkAction={
          switchable ? (
            <button
              type="button"
              onClick={() => setPicking(true)}
              className="tap flex h-8 shrink-0 items-center gap-1 rounded-pill bg-jumpa-white px-3 text-[10px] leading-4 font-semibold text-jumpa-primary-600 active:scale-95"
            >
              Change
              <ChevronDownIcon aria-hidden="true" className="size-4" />
            </button>
          ) : null
        }
      />

      {picking ? (
        <NetworkSheet
          symbol={symbol}
          chains={chains}
          selected={chain.id}
          onSelect={(next) => {
            setChain(next);
            setPicking(false);
            router.push(
              `/assets?token=${symbol.toLowerCase()}&network=${next.id}&deposit=1`,
            );
          }}
          onClose={() => setPicking(false)}
        />
      ) : null}
    </div>
  );
}
