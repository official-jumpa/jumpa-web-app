import type { ReactNode } from "react";
import { WalletIcon } from "@/components/ui/icons/wallet";
import { Select } from "@/components/ui/select";
import { getAssetLogo } from "@/lib/assets";
import { SEND_ASSETS } from "@/lib/transfer";

const ASSET_OPTIONS = SEND_ASSETS.map((symbol) => ({
  value: symbol,
  label: symbol,
  icon: getAssetLogo(symbol),
}));

/** One side of the swap: what is typed, the asset picker and that asset's balance. */
export function SwapLeg({
  label,
  symbol,
  balance,
  onSymbolChange,
  children,
}: {
  label: string;
  symbol: string;
  balance: string;
  onSymbolChange: (next: string) => void;
  /** The value — an input on the send leg, plain text on the receive leg. */
  children: ReactNode;
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl bg-jumpa-white p-2.5">
      <span className="flex min-w-0 flex-1 flex-col gap-1 px-2.5">
        <span className="text-[10px] leading-3 text-jumpa-black/50 uppercase">
          {label}
        </span>
        {children}
      </span>

      <span className="flex shrink-0 flex-col items-end justify-center gap-2.5">
        <Select
          variant="pill"
          label={`${label} asset`}
          value={symbol}
          options={ASSET_OPTIONS}
          onValueChange={onSymbolChange}
        />

        <span className="flex items-center gap-1 text-[10px] leading-3 font-bold text-jumpa-primary-400">
          <WalletIcon
            aria-hidden="true"
            className="size-3.5 text-jumpa-primary-600"
          />
          Balance: {balance}
        </span>
      </span>
    </div>
  );
}
