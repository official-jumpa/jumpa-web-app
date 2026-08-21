import Image from "next/image";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { getAssetLogo } from "@/lib/assets";
import type { Asset } from "@/lib/wallet";

/**
 * Where the total balance actually sits, one row per asset.
 *
 * Portalled to the body: the hero is `isolate`, so a sheet rendered inside it
 * would paint under the bottom nav no matter its z-index.
 */
export function BalanceSheet({
  balance,
  assets,
  onClose,
}: {
  balance: string;
  assets: Asset[];
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!mounted) return null;

  return createPortal(
    <BottomSheet onClose={onClose}>
      <h2 className="text-xl leading-6 font-bold text-jumpa-black">
        Balance Details
      </h2>

      <p className="mt-4 text-sm leading-4.5 text-jumpa-neutral-400">
        Your Total Balance
      </p>
      <p className="mt-1 text-[28px] leading-8 font-bold text-jumpa-black">
        ${balance}
      </p>

      {assets.length === 0 ? (
        <p className="mt-4 py-6 text-center text-sm text-jumpa-neutral-400">
          No assets yet.
        </p>
      ) : (
        <ul className="mt-4 flex max-h-[46vh] flex-col gap-2 overflow-y-auto">
          {assets.map((asset, index) => (
            <li
              // Placeholder data can repeat a symbol, so the index is the key.
              key={`${asset.symbol}-${index}`}
              className="flex items-center justify-between gap-3 rounded-panel bg-jumpa-neutral-50 px-3 py-3"
            >
              <span className="flex min-w-0 items-center gap-2">
                {/* Resolved from the symbol so the glyph can never disagree with it. */}
                <Image
                  src={getAssetLogo(asset.symbol)}
                  alt=""
                  width={32}
                  height={32}
                  className="size-8 shrink-0 rounded-full object-contain"
                />
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-sm leading-4.5 font-medium text-jumpa-black">
                    {asset.symbol}
                  </span>
                  <span className="truncate text-[11px] leading-3.5 text-jumpa-neutral-350">
                    {asset.name}
                  </span>
                </span>
              </span>

              <span className="shrink-0 text-sm leading-4.5 font-semibold text-jumpa-black">
                {asset.balance}
              </span>
            </li>
          ))}
        </ul>
      )}
    </BottomSheet>,
    document.body,
  );
}
