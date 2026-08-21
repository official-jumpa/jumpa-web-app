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
      {((card as any).explorerUrl || (card as any).txHash) && (
        <>
          <CardRule />
          <div className="flex items-center justify-between px-2.5 pt-0.5 pb-1 text-[9px]">
            <span className="text-jumpa-black/60 font-medium">On-Chain</span>
            <a
              href={
                (card as any).explorerUrl ||
                `https://stellar.expert/explorer/testnet/tx/${(card as any).txHash}`
              }
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-bold text-jumpa-primary-700 hover:text-jumpa-primary-900 transition-colors underline"
            >
              Verify on Explorer ↗
            </a>
          </div>
        </>
      )}
    </ChatCard>
  );
}
