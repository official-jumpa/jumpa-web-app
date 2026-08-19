import Image from "next/image";
import {
  CardAmount,
  CardRule,
  CardStats,
  CardTitle,
  ChatCard,
} from "@/components/chat/chat-card";
import type { QuoteCard as Quote } from "@/lib/chat";

/** Live swap quote: what you pay, what you get, and the terms. */
export function QuoteCard({ card }: { card: Quote }) {
  return (
    <ChatCard>
      <CardTitle title={card.title}>
        <p className="text-[10px] leading-4 text-jumpa-black/50">
          {card.status.lead}
          <span className="font-bold text-jumpa-black">
            {card.status.value}
          </span>
        </p>
      </CardTitle>

      <CardRule />

      <div className="relative flex w-full flex-col gap-2">
        <CardAmount row={card.pay} />
        <CardAmount row={card.receive} />
        {/* Straddles the gap between the two rows; the export carries its shadow. */}
        <Image
          src="/images/chat/swap-arrow.svg"
          alt=""
          width={127}
          height={127}
          className="pointer-events-none absolute top-[-12.5px] left-[45.5px] max-w-none"
        />
      </div>

      <CardRule />
      <CardStats stats={card.stats} />
    </ChatCard>
  );
}
