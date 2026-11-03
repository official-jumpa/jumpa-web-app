"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AssetRow, AssetRule } from "@/components/assets/asset-row";
import { NetworkSheet } from "@/components/assets/network-sheet";
import { FiatAccounts } from "@/components/home/fiat-accounts";
import { SearchAltIcon } from "@/components/ui/icons/search-alt";
import { ScreenHeader } from "@/components/ui/screen-header";
import {
  depositHref,
  useAssetNetwork,
  walletHref,
} from "@/hooks/use-asset-network";
import type { Asset } from "@/lib/wallet";

const TITLE = {
  wallets: "All Wallets",
  crypto: "Deposit Crypto",
  naira: "Deposit Naira",
} as const;

/**
 * Every wallet, searchable. Wallets and Deposit Crypto ask which network
 * first, landing on the chain's wallet or its deposit address; Deposit Naira
 * picks the network on its own form, so a row goes straight there.
 */
export function AssetPicker({
  assets,
  mode = "wallets",
  back = "/home",
}: {
  assets: Asset[];
  mode?: keyof typeof TITLE;
  back?: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const network = useAssetNetwork(mode === "crypto" ? depositHref : walletHref);

  const term = query.trim().toLowerCase();
  const matches = term
    ? assets.filter((asset) =>
        [asset.symbol, asset.name].some((field) =>
          field.toLowerCase().includes(term),
        ),
      )
    : assets;

  return (
    // Neither mode carries the tab bar: both are a step inside a flow.
    <div className="flex min-h-dvh flex-col px-4.5 pt-[calc(env(safe-area-inset-top)+1.5rem)] pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
      <ScreenHeader back={back} title={TITLE[mode]} round />

      {/* h-14.5 — the design's stroke is inside, a CSS border is outside. */}
      <label className="mt-4 flex h-14.5 w-full items-center gap-2 rounded-pill border border-jumpa-neutral-60 bg-jumpa-neutral-50 pr-5.25 pl-4">
        <SearchAltIcon
          aria-hidden="true"
          className="size-6 shrink-0 text-jumpa-primary-950"
        />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search for tokens"
          aria-label="Search for tokens"
          className="w-full min-w-0 bg-transparent text-sm leading-4 font-medium text-jumpa-primary-950 outline-none placeholder:text-jumpa-primary-950"
        />
      </label>

      <div className="mt-3.5">
        <FiatAccounts />
      </div>

      {matches.length === 0 ? (
        <p className="mt-10 text-center text-sm text-jumpa-neutral-400">
          No wallet matches &ldquo;{query}&rdquo;.
        </p>
      ) : (
        <ul className="mt-4 flex flex-col gap-4 rounded-surface border border-jumpa-neutral-60 bg-jumpa-neutral-50 px-6 py-5">
          {matches.map((asset, index) => (
            <li key={asset.symbol} className="flex flex-col gap-4">
              {index > 0 ? <AssetRule /> : null}
              <AssetRow
                asset={asset}
                value={asset.balance}
                onSelect={() =>
                  mode === "naira"
                    ? router.push(`/receive?rail=fiat&token=${asset.symbol}`)
                    : network.start(asset.symbol)
                }
              />
            </li>
          ))}
        </ul>
      )}

      {network.asking ? (
        <NetworkSheet
          symbol={network.asking}
          chains={network.chains}
          description={
            mode === "wallets"
              ? `${network.asking} lives on more than one chain. Pick the one you want to see.`
              : undefined
          }
          onSelect={network.choose}
          onClose={network.cancel}
        />
      ) : null}
    </div>
  );
}
