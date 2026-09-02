import Image from "next/image";
import type { ReactNode } from "react";
import { CaretDownIcon } from "@/components/ui/icons/caret-down";
import { WalletIcon } from "@/components/ui/icons/wallet";
import { getAssetLogo } from "@/lib/assets";

/** One side of the swap: what is typed, the asset pill and that asset's balance. */
export function SwapLeg({
  label,
  symbol,
  balance,
  children,
}: {
  label: string;
  symbol: string;
  balance: string;
  /** The value — an input on the send leg, plain text on the receive leg. */
  children: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-surface bg-jumpa-white px-4 py-3.5">
      <span className="flex min-w-0 flex-col gap-1.5">
        <span className="text-[8px] leading-2 font-medium tracking-wide text-jumpa-neutral-350 uppercase">
          {label}
        </span>
        {children}
      </span>

      <span className="flex shrink-0 flex-col items-end gap-1">
        <span className="flex items-center gap-1 rounded-pill bg-jumpa-primary-50 py-1.5 pr-2 pl-2.5 text-[10px] leading-3 font-semibold text-jumpa-primary-950">
          <Image
            src={getAssetLogo(symbol)}
            alt=""
            width={16}
            height={16}
            className="size-4 rounded-full object-contain"
          />
          {symbol}
          <CaretDownIcon aria-hidden="true" className="size-3.5" />
        </span>
        <span className="flex items-center gap-1 text-[8px] leading-2 font-medium text-jumpa-primary-600">
          <WalletIcon aria-hidden="true" className="size-3" />
          Balance: {balance}
        </span>
      </span>
    </div>
  );
}
