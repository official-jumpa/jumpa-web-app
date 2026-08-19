import Image from "next/image";
import { CardAmount, CardRule, ChatCard } from "@/components/chat/chat-card";
import type { AssetOption, TransferCard as Transfer } from "@/lib/chat";
import { cn } from "@/lib/cn";

/** Outgoing transfer: who it goes to, how much, and which asset pays for it. */
export function TransferCard({ card }: { card: Transfer }) {
  const { contact } = card;

  return (
    <ChatCard>
      <div className="flex w-full items-center gap-2">
        <span className="size-11.5 shrink-0 overflow-hidden rounded-surface bg-jumpa-white">
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

      {card.options.map((option) => (
        <AssetRow key={option.symbol} option={option} />
      ))}
    </ChatCard>
  );
}

/** One payment source. Mirrors CardAmount, but value-first with a trailing total. */
function AssetRow({ option }: { option: AssetOption }) {
  return (
    <div
      className={cn(
        "flex h-11.5 w-full items-center gap-2.5 rounded-surface p-2.5",
        option.selected
          ? "border border-jumpa-primary-600 bg-jumpa-primary-100"
          : "bg-jumpa-white",
      )}
    >
      <span className="flex min-w-0 flex-1 flex-col px-2.5">
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
    </div>
  );
}
