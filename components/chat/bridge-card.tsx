import {
  CardAmount,
  CardRule,
  CardStats,
  CardTitle,
  ChatCard,
  StatText,
} from "@/components/chat/chat-card";
import { ArrowUpIcon } from "@/components/ui/icons/arrow-up";
import type { BridgeCard as Bridge } from "@/lib/chat";

/**
 * Cross-chain quote. Same shape as a swap quote, except each side names its
 * chain and the direction is fixed — a bridge only runs one way.
 */
export function BridgeCard({ card }: { card: Bridge }) {
  return (
    <ChatCard>
      <CardTitle title={card?.title || "Bridge"}>
        {card?.status ? <StatText stat={card.status} /> : null}
      </CardTitle>

      <CardRule />

      {/* The direction disc sits on the seam between the two rows. */}
      <div className="relative flex w-full flex-col gap-2">
        <CardAmount
          row={card?.pay || { caption: "YOU PAY", value: "" }}
        />
        <CardAmount
          row={card?.receive || { caption: "YOU RECEIVE", value: "" }}
        />

        <span
          aria-hidden="true"
          className="absolute top-1/2 left-1/2 flex size-7.5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-[0.5px] border-jumpa-black/10 bg-jumpa-primary-525 text-jumpa-alt-400 shadow-lg"
        >
          <ArrowUpIcon className="size-4.5 -scale-y-100" />
        </span>
      </div>

      <CardRule />

      {card?.stats && card.stats.length > 0 ? (
        <CardStats stats={card.stats} />
      ) : null}
    </ChatCard>
  );
}
