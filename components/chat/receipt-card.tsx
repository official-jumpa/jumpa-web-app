import {
  CardAmount,
  CardRule,
  CardStats,
  CardTitle,
  ChatCard,
} from "@/components/chat/chat-card";
import { ArrowUpRightIcon } from "@/components/ui/icons/arrow-up-right";
import { getExplorerTxUrl } from "@/lib/blockchain";
import type { ReceiptCard as Receipt } from "@/lib/chat";

function explorerHref(card: Receipt) {
  if (card.explorerUrl) return card.explorerUrl;
  if (card.txHash) {
    return getExplorerTxUrl("stellar", card.txHash, true);
  }
  return null;
}

/** Settled transaction, on the design's lime slab with a purple currency chip. */
export function ReceiptCard({ card }: { card: Receipt }) {
  const href = explorerHref(card);

  return (
    <ChatCard className="bg-jumpa-alt-400">
      <CardTitle title={card.title}>
        <span className="text-[11px] leading-4 text-jumpa-neutral-750">
          {card.status}
        </span>
      </CardTitle>

      <CardRule />
      <CardAmount row={card.balance} badgeTone="brand" />
      <CardRule />

      {card.stats.length > 0 ? <CardStats stats={card.stats} /> : null}

      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="tap flex h-9 items-center justify-center gap-1.5 rounded-pill bg-jumpa-alt-950/10 text-[11px] leading-4 font-semibold text-jumpa-alt-950 active:scale-[0.99]"
        >
          Verify on Explorer
          <ArrowUpRightIcon aria-hidden="true" className="size-3" />
        </a>
      ) : null}
    </ChatCard>
  );
}
