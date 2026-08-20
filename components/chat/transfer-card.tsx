"use client";

import { useState } from "react";
import Image from "next/image";
import { CardAmount, CardRule, ChatCard } from "@/components/chat/chat-card";
import type { AssetOption, TransferCard as Transfer } from "@/lib/chat";
import { cn } from "@/lib/cn";
import { getAssetLogo } from "@/lib/assets";

/** Outgoing transfer: who it goes to, how much, and selectable asset that pays for it. */
export function TransferCard({
  card,
  onSelectOption,
}: {
  card: Transfer;
  onSelectOption?: (symbol: string) => void;
}) {
  const { contact } = card;
  const [selectedSymbol, setSelectedSymbol] = useState(
    card.options.find((o) => o.selected)?.symbol || card.options[0]?.symbol,
  );

  const handleSelect = (symbol: string) => {
    setSelectedSymbol(symbol);
    onSelectOption?.(symbol);
  };

  return (
    <ChatCard>
      <div className="flex w-full items-center gap-2">
        <span className="size-11.5 shrink-0 overflow-hidden rounded-surface bg-jumpa-white shadow-2xs">
          <Image src={contact.avatar} alt="" width={46} height={46} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col whitespace-nowrap">
          <span className="text-xs leading-5 font-medium text-jumpa-black">
            {contact.name}
          </span>
          <span className="text-[10px] leading-4 text-jumpa-black/50">
            {contact.handle}
          </span>
        </span>
      </div>

      <CardRule />
      <CardAmount row={card.amount} />
      <CardRule />

      <p className="px-2.5 text-[8px] leading-4 text-jumpa-black/50">
        {card.prompt}
      </p>

      <div className="flex flex-col gap-1.5">
        {card.options.map((option) => (
          <AssetRow
            key={option.symbol}
            option={option}
            isSelected={option.symbol === selectedSymbol}
            onSelect={() => handleSelect(option.symbol)}
          />
        ))}
      </div>
    </ChatCard>
  );
}

/** One payment source with token logo, balance, and interactive selection. */
function AssetRow({
  option,
  isSelected,
  onSelect,
}: {
  option: AssetOption;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const logo = getAssetLogo(option.symbol);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex h-11.5 w-full items-center gap-2.5 rounded-surface p-2.5 transition-all text-left cursor-pointer",
        isSelected
          ? "border border-jumpa-primary-600 bg-jumpa-primary-100 shadow-2xs"
          : "bg-jumpa-white hover:bg-jumpa-neutral-50",
      )}
    >
      <div className="size-6 shrink-0 flex items-center justify-center rounded-full bg-jumpa-neutral-100 p-0.5">
        <Image
          src={logo}
          alt={option.symbol}
          width={20}
          height={20}
          className="size-5 rounded-full object-contain"
        />
      </div>

      <span className="flex min-w-0 flex-1 flex-col px-1">
        <span className="truncate text-base leading-4 font-medium text-jumpa-black">
          {option.symbol}
        </span>
        <span className="text-[6px] leading-2.5 text-jumpa-black/50">
          BALANCE - <span className="font-bold">{option.balance}</span>
        </span>
      </span>

      <span className="px-2.5 text-base leading-4 font-medium whitespace-nowrap text-jumpa-neutral-550">
        {option.amount}
      </span>
    </button>
  );
}
