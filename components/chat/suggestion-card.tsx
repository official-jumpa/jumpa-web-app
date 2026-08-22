"use client";

import { BadgePercentIcon } from "@/components/ui/icons/badge-percent";
import { EuroCircleIcon } from "@/components/ui/icons/euro-circle";
import { MoneyBillIcon } from "@/components/ui/icons/money-bill";
import { SwitchHorizontalIcon } from "@/components/ui/icons/switch-horizontal";
import { WalletPlusIcon } from "@/components/ui/icons/wallet-plus";

const SUGGESTIONS = [
  { label: "Add funds", Icon: WalletPlusIcon },
  { label: "Cash In", Icon: EuroCircleIcon },
  { label: "Check Balance", Icon: MoneyBillIcon },
  { label: "Create Savings", Icon: BadgePercentIcon },
  { label: "Swap 20 USD to XLM", Icon: SwitchHorizontalIcon },
];

/**
 * Opening prompts, shown until the conversation starts. Side padding is 8, not the
 * design's 10 — its first chip row is 3px wider than the card and would wrap early.
 *
 * The 10px chip label is load-bearing: at 12px row one measures 361 against a 333
 * content box on a 393 screen and wraps 2/2/1 instead of the design's 3/2.
 */
export function SuggestionCard({
  onSelect,
}: {
  onSelect?: (prompt: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-x-1 gap-y-2 rounded-surface bg-jumpa-white px-2 py-2.5">
      {SUGGESTIONS.map(({ label, Icon }) => (
        <button
          key={label}
          type="button"
          onClick={() => onSelect?.(label)}
          className="flex items-center gap-2 rounded-pill bg-jumpa-neutral-95 px-3 py-2 text-[10px] font-medium whitespace-nowrap text-jumpa-black tap hover:bg-jumpa-neutral-100 active:scale-95 cursor-pointer"
        >
          <Icon className="size-6 text-jumpa-primary-600" />
          {label}
        </button>
      ))}
    </div>
  );
}
