"use client";

import { useState } from "react";
import { AssetRow, AssetRule } from "@/components/assets/asset-row";
import { NetworkSheet } from "@/components/assets/network-sheet";
import { BottomNav } from "@/components/home/bottom-nav";
import { SearchAltIcon } from "@/components/ui/icons/search-alt";
import { ScreenHeader } from "@/components/ui/screen-header";
import {
  depositHref,
  useAssetNetwork,
  walletHref,
} from "@/hooks/use-asset-network";
import type { Asset } from "@/lib/wallet";

/**
 * Every wallet, searchable. Both modes ask which network first: Receive lands
 * on the deposit address, "See All" on that chain's wallet screen.
 */
export function AssetPicker({
  assets,
  receive = false,
  back = "/home",
}: {
  assets: Asset[];
  receive?: boolean;
  back?: string;
}) {
  const [query, setQuery] = useState("");
  const network = useAssetNetwork(receive ? depositHref : walletHref);

  const term = query.trim().toLowerCase();
  const matches = term
    ? assets.filter((asset) =>
        [asset.symbol, asset.name, asset.label ?? ""].some((field) =>
          field.toLowerCase().includes(term),
        ),
      )
    : assets;

  return (
    // Receive is a step in the deposit flow, so it carries no tab bar.
    <div
      className={`flex min-h-dvh flex-col px-4.5 pt-6 ${receive ? "pb-[calc(env(safe-area-inset-bottom)+1.5rem)]" : "pb-27"}`}
    >
      <ScreenHeader
        back={back}
        title={receive ? "Deposit Crypto" : "All Wallets"}
        round
      />

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

      {matches.length === 0 ? (
        <p className="mt-10 text-center text-sm text-jumpa-neutral-400">
          No wallet matches &ldquo;{query}&rdquo;.
        </p>
      ) : (
        <ul className="mt-3.5 flex flex-col gap-4 rounded-surface border border-jumpa-neutral-60 bg-jumpa-neutral-50 px-6 py-5">
          {matches.map((asset, index) => (
            <li key={asset.symbol} className="flex flex-col gap-4">
              {index > 0 ? <AssetRule /> : null}
              <AssetRow
                asset={asset}
                onSelect={() => network.start(asset.symbol)}
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
            receive
              ? undefined
              : `${network.asking} lives on more than one chain. Pick the one you want to see.`
          }
          onSelect={network.choose}
          onClose={network.cancel}
        />
      ) : null}

      {receive ? null : <BottomNav />}
    </div>
  );
}
