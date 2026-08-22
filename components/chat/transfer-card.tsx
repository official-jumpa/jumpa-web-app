import Image from "next/image";
import { useState } from "react";
import { ArrowUpRightIcon } from "@/components/ui/icons/arrow-up-right";
import { getAssetLogo } from "@/lib/assets";
import type { AssetOption, TransferCard as Transfer } from "@/lib/chat";
import { cn } from "@/lib/cn";

/**
 * Outgoing transfer awaiting confirmation. Warm paper rather than the grey card
 * stack, so the amount and the recipient read first and the asset picker second.
 */
export function TransferCard({
  card,
  onSelectOption,
}: {
  card: Transfer;
  onSelectOption?: (symbol: string) => void;
}) {
  const { contact } = card;
  const [selectedSymbol, setSelectedSymbol] = useState(
    card.options.find((option) => option.selected)?.symbol ||
      card.options[0]?.symbol,
  );

  const handleSelect = (symbol: string) => {
    setSelectedSymbol(symbol);
    onSelectOption?.(symbol);
  };

  const badgeLogo = card.amount.badge ? getAssetLogo(card.amount.badge) : null;
  // The backend sends the raw address as both, and repeating it reads as a bug.
  const handle = contact.handle !== contact.name ? contact.handle : null;

  return (
    <div className="w-full overflow-hidden rounded-xl border border-jumpa-warm-200 bg-jumpa-warm-50 shadow-xs">
      <div className="flex flex-col gap-3 p-3.5">
        <div className="flex items-center gap-2">
          <span className="flex size-6.5 shrink-0 items-center justify-center rounded-pill bg-jumpa-warm-100 text-jumpa-primary-600">
            <ArrowUpRightIcon className="size-3" />
          </span>
          <span className="truncate text-[10px] leading-4 font-semibold tracking-wide text-jumpa-warm-700 uppercase">
            {card.amount.caption}
          </span>
        </div>

        <div className="flex items-center justify-between gap-2">
          <span className="min-w-0 truncate text-[26px] leading-8 font-semibold text-jumpa-black">
            {card.amount.value}
          </span>
          {card.amount.badge ? (
            <span className="flex shrink-0 items-center gap-1.5 rounded-pill bg-jumpa-white py-1 pr-2.5 pl-1 shadow-2xs">
              {badgeLogo ? (
                <Image
                  src={badgeLogo}
                  alt=""
                  width={18}
                  height={18}
                  className="size-4.5 rounded-full object-contain"
                />
              ) : null}
              <span className="text-[11px] leading-4 font-semibold text-jumpa-black">
                {card.amount.badge}
              </span>
            </span>
          ) : null}
        </div>

        <div className="rounded-xl bg-jumpa-white px-3 py-2.5 shadow-2xs">
          <span className="block text-[10px] leading-3.5 font-medium tracking-wide text-jumpa-neutral-350 uppercase">
            To
          </span>
          <span className="block truncate text-[13px] leading-5 font-medium text-jumpa-black">
            {contact.name}
          </span>
          {handle ? (
            <span className="block truncate text-[11px] leading-4 text-jumpa-neutral-400">
              {handle}
            </span>
          ) : null}
        </div>
      </div>

      <span aria-hidden="true" className="rule-dashed block h-px w-full" />

      <div className="flex flex-col gap-2 p-3.5">
        <p className="text-[11px] leading-4 text-jumpa-warm-700">
          {card.prompt}
        </p>
        {card.options.map((option) => (
          <AssetRow
            key={option.symbol}
            option={option}
            isSelected={option.symbol === selectedSymbol}
            onSelect={() => handleSelect(option.symbol)}
          />
        ))}
      </div>
    </div>
  );
}

/** One payment source: token, balance, and what it contributes to the transfer. */
function AssetRow({
  option,
  isSelected,
  onSelect,
}: {
  option: AssetOption;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={isSelected}
      className={cn(
        "flex h-12 w-full cursor-pointer items-center gap-2.5 rounded-xl border px-2.5 text-left transition-colors",
        isSelected
          ? "border-jumpa-primary-600 bg-jumpa-primary-50"
          : "border-jumpa-warm-200 bg-jumpa-white hover:bg-jumpa-warm-100",
      )}
    >
      <Image
        src={getAssetLogo(option.symbol)}
        alt=""
        width={24}
        height={24}
        className="size-6 shrink-0 rounded-full object-contain"
      />

      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-[13px] leading-4.5 font-semibold text-jumpa-black">
          {option.symbol}
        </span>
        <span className="truncate text-[10px] leading-3.5 text-jumpa-neutral-400">
          Balance {option.balance}
        </span>
      </span>

      <span className="shrink-0 text-sm leading-5 font-semibold whitespace-nowrap text-jumpa-black">
        {option.amount}
      </span>
    </button>
  );
}

/* Previous grey-stack transfer card, kept for reference. Restore the imports for
   CardAmount, CardRule and ChatCard from "@/components/chat/chat-card".

export function TransferCard({ card, onSelectOption }) {
  const { contact } = card;
  return (
    <ChatCard>
      <div className="flex w-full items-center gap-2">
        <span className="size-11.5 shrink-0 overflow-hidden rounded-xl bg-jumpa-white shadow-2xs">
          <Image src={contact.avatar} alt="" width={46} height={46} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col whitespace-nowrap">
          <span className="text-[13px] leading-5 font-medium text-jumpa-black">
            {contact.name}
          </span>
          <span className="text-xs leading-4 text-jumpa-black/50">
            {contact.handle}
          </span>
        </span>
      </div>

      <CardRule />
      <CardAmount row={card.amount} />
      <CardRule />

      <p className="px-1 text-[13px] leading-5 text-jumpa-black/50">
        {card.prompt}
      </p>

      <div className="flex flex-col gap-1.5">
        {card.options.map((option) => (
          <AssetRow key={option.symbol} option={option} ... />
        ))}
      </div>
    </ChatCard>
  );
}
*/
