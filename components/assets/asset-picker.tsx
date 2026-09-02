"use client";

import { useState } from "react";
import { AssetRow } from "@/components/assets/asset-row";
import { FIELD_INPUT, FIELD_SHELL } from "@/components/transfer/field";
import { SearchAltIcon } from "@/components/ui/icons/search-alt";
import { ScreenHeader } from "@/components/ui/screen-header";
import type { Asset } from "@/lib/wallet";

/** Every wallet, searchable. Reached from "See All" and from Receive. */
export function AssetPicker({ assets }: { assets: Asset[] }) {
  const [query, setQuery] = useState("");

  const term = query.trim().toLowerCase();
  const matches = term
    ? assets.filter(
        (asset) =>
          asset.symbol.toLowerCase().includes(term) ||
          asset.name.toLowerCase().includes(term),
      )
    : assets;

  return (
    <div className="flex min-h-dvh flex-col px-4.5 pt-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
      <ScreenHeader back="/home" title="All Wallets" round />

      <label className={`${FIELD_SHELL} mt-6`}>
        <SearchAltIcon
          aria-hidden="true"
          className="size-6 shrink-0 text-jumpa-primary-600"
        />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search"
          aria-label="Search wallets"
          className={FIELD_INPUT}
        />
      </label>

      {matches.length === 0 ? (
        <p className="mt-10 text-center text-sm text-jumpa-neutral-400">
          No wallet matches &ldquo;{query}&rdquo;.
        </p>
      ) : (
        <ul className="mt-4 flex flex-col gap-2">
          {matches.map((asset, index) => (
            // Placeholder data can repeat a symbol, so the index is the key.
            <li key={`${asset.symbol}-${index}`}>
              <AssetRow asset={asset} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
