"use client";

import Image from "next/image";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { CheckIcon } from "@/components/ui/icons/check";
import { getAssetLogo } from "@/lib/assets";
import type { Chain } from "@/lib/networks";

/**
 * Which chain the asset is being used on. Asked before the deposit address
 * appears, again from the address screen when the sender needs a different
 * network, and once more from the wallet list.
 */
export function NetworkSheet({
  symbol,
  chains,
  selected,
  description,
  onSelect,
  onClose,
}: {
  symbol: string;
  chains: Chain[];
  selected?: string;
  /** Defaults to the deposit warning; the wallet list passes its own. */
  description?: string;
  onSelect: (chain: Chain) => void;
  onClose: () => void;
}) {
  return (
    <BottomSheet onClose={onClose} pb="pb-7.5">
      <h2 className="pt-1 text-center text-base leading-5 font-semibold text-jumpa-black">
        Select network
      </h2>
      <p className="mt-2 text-center text-xs leading-4.5 text-jumpa-neutral-400">
        {description ??
          `Choose the network the sender will use for ${symbol}. Funds sent on any other network cannot be recovered.`}
      </p>

      <ul className="mt-5 flex flex-col gap-2">
        {chains.map((chain) => {
          const active = chain.id === selected;
          return (
            <li key={chain.id}>
              <button
                type="button"
                aria-pressed={active}
                onClick={() => onSelect(chain)}
                className={`tap flex w-full items-center gap-3 rounded-surface px-4 py-3 text-left active:scale-[0.99] ${
                  active
                    ? "bg-jumpa-primary-50 ring-1 ring-jumpa-primary-600"
                    : "bg-jumpa-neutral-50"
                }`}
              >
                <Image
                  src={getAssetLogo(chain.name)}
                  alt=""
                  width={32}
                  height={32}
                  className="size-8 shrink-0 rounded-full object-contain"
                />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm leading-4.5 font-semibold text-jumpa-black">
                    {chain.name}
                  </span>
                  <span className="truncate text-[10px] leading-3.5 text-jumpa-neutral-400">
                    {chain.caption}
                  </span>
                </span>
                {active ? (
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-jumpa-primary-600 text-jumpa-white">
                    <CheckIcon className="size-3" />
                  </span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>
    </BottomSheet>
  );
}
