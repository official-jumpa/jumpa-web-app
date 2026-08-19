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
 * Opening prompts, offered only until the conversation starts. Side padding is
 * 8, not the 10 the design draws — its first row is 3px wider than the card and
 * would otherwise wrap early.
 */
export function SuggestionCard() {
  return (
    <div className="flex flex-wrap gap-x-1 gap-y-2 rounded-surface bg-jumpa-white px-2 py-2.5">
      {SUGGESTIONS.map(({ label, Icon }) => (
        <button
          key={label}
          type="button"
          className="flex items-center gap-2 rounded-pill bg-jumpa-neutral-95 px-3 py-2 text-[10px] font-medium whitespace-nowrap text-jumpa-black"
        >
          <Icon className="size-6 text-jumpa-primary-600" />
          {label}
        </button>
      ))}
    </div>
  );
}
