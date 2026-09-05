import type { ReactNode } from "react";
import { WalletIcon } from "@/components/ui/icons/wallet";
import { Select } from "@/components/ui/select";
import { getAssetLogo } from "@/lib/assets";

/** Format balance to at most 4 decimal places without asset name suffix. */
export function formatBalance(val: string | number): string {
  if (val === undefined || val === null) return "0";
  const str = String(val).trim();
  const match = str.match(/-?\d+(?:\.\d+)?/);
  if (!match) return "0";

  const numStr = match[0];
  const [intPart, decPart] = numStr.split(".");
  if (!decPart) return intPart;

  const truncated = decPart.slice(0, 4).replace(/0+$/, "");
  return truncated ? `${intPart}.${truncated}` : intPart;
}

/** One side of the swap: what is typed, the asset picker and that asset's balance. */
export function SwapLeg({
  label,
  symbol,
  balance,
  assets,
  onSymbolChange,
  children,
}: {
  label: string;
  symbol: string;
  balance: string;
  /** Asset symbols available for this leg on the active chain/network. */
  assets: readonly string[];
  onSymbolChange: (next: string) => void;
  /** The value — an input on the send leg, plain text on the receive leg. */
  children: ReactNode;
}) {
  const options = assets.map((s) => ({
    value: s,
    label: s,
    icon: getAssetLogo(s),
  }));

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
          options={options}
          onValueChange={onSymbolChange}
        />

        <span className="flex items-center gap-1 text-[10px] leading-3 font-bold text-jumpa-primary-400">
          <WalletIcon
            aria-hidden="true"
            className="size-3.5 text-jumpa-primary-600"
          />
          Balance: {formatBalance(balance)}
        </span>
      </span>
    </div>
  );
}
