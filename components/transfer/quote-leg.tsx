import type { ReactNode } from "react";
import { WalletIcon } from "@/components/ui/icons/wallet";
import { Select, type SelectOption } from "@/components/ui/select";
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

/** Token pickers resolve their glyph from the symbol, so the two cannot disagree. */
export function assetOptions(symbols: readonly string[]): SelectOption[] {
  return symbols.map((symbol) => ({
    value: symbol,
    label: symbol,
    icon: getAssetLogo(symbol),
  }));
}

/** Swap sits the legs on a tinted card; deposit sits them straight on the screen. */
const TONE = {
  white: "bg-jumpa-white",
  neutral: "bg-jumpa-neutral-50",
} as const;

/**
 * One side of a quote: what is typed, what it is denominated in, and that
 * asset's balance. Shared by the swap and the fiat deposit, so the two legs
 * cannot drift.
 */
export function QuoteLeg({
  label,
  symbol,
  balance,
  options,
  tone = "white",
  onSymbolChange,
  children,
}: {
  label: string;
  symbol: string;
  /** Omit on a leg with no wallet behind it, e.g. the fiat side of a deposit. */
  balance?: string;
  options: SelectOption[];
  tone?: keyof typeof TONE;
  onSymbolChange: (next: string) => void;
  /** The value — an input on the send leg, plain text on the receive leg. */
  children: ReactNode;
}) {
  return (
    <div
      className={`flex items-center gap-2.5 rounded-xl p-2.5 ${TONE[tone]}`}
    >
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

        {balance === undefined ? null : (
          <span className="flex items-center gap-1 text-[10px] leading-3 font-bold text-jumpa-primary-400">
            <WalletIcon
              aria-hidden="true"
              className="size-3.5 text-jumpa-primary-600"
            />
            Balance: {formatBalance(balance)}
          </span>
        )}
      </span>
    </div>
  );
}
