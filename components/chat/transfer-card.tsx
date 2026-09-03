"use client";

import { useState } from "react";
import { ContactRow } from "@/components/chat/card-rows";
import {
  CardAmount,
  CardRule,
  CardTitle,
  ChatCard,
} from "@/components/chat/chat-card";
import type { AssetOption, TransferCard as Transfer } from "@/lib/chat";
import { cn } from "@/lib/cn";

/** Outgoing transfer awaiting confirmation: who, how much, and paid from what. */
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

  // The backend sends the raw address as both, and repeating it reads as a bug.
  const meta = contact.handle !== contact.name ? contact.handle : "";

  return (
    <ChatCard>
      {meta ? (
        <ContactRow
          contact={{ name: contact.name, meta, avatar: contact.avatar }}
        />
      ) : (
        <CardTitle title={contact.name} />
      )}

      <CardRule />
      <CardAmount row={card.amount} />
      <CardRule />

      <p className="px-2.5 text-[11px] leading-4 text-jumpa-black/50">
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
    </ChatCard>
  );
}

/** One payment source: token, its balance, and what it contributes. */
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
      // Both states carry a border so selecting one cannot change the height.
      className={cn(
        "tap flex h-16 w-full items-center gap-2.5 rounded-surface border p-3 text-left active:scale-[0.99]",
        isSelected
          ? "border-jumpa-primary-600 bg-jumpa-primary-100"
          : "border-transparent bg-jumpa-white",
      )}
    >
      <span className="flex min-w-0 flex-1 flex-col gap-0.5 px-2">
        <span className="truncate text-lg leading-5.5 font-medium text-jumpa-black">
          {option.symbol}
        </span>
        <span className="truncate text-[10px] leading-3 tracking-wider text-jumpa-black/50 uppercase">
          Balance -{" "}
          <span className="font-bold text-jumpa-black">{option.balance}</span>
        </span>
      </span>

      <span className="shrink-0 px-2 text-lg leading-5.5 font-medium whitespace-nowrap text-jumpa-neutral-550">
        {option.amount}
      </span>
    </button>
  );
}
