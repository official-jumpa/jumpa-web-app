import {
  CardAmount,
  CardRule,
  CardStats,
  CardTitle,
  ChatCard,
} from "@/components/chat/chat-card";
import type { ReceiptCard as Receipt } from "@/lib/chat";

/** Settled swap. Lime rather than grey, to read as a confirmation. */
export function ReceiptCard({ card }: { card: Receipt }) {
  return (
    <ChatCard className="bg-jumpa-alt-400">
      <CardTitle title={card.title}>
        <p className="text-xs leading-4 text-jumpa-neutral-750">
          {card.status}
        </p>
      </CardTitle>

      <CardRule />
      <CardAmount
        row={card.balance}
        badgeClassName="bg-jumpa-primary-550 text-jumpa-white"
      />
      <CardRule />
      <CardStats stats={card.stats} />
    </ChatCard>
  );
}
