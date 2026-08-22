import Image from "next/image";
import { ArrowUpRightIcon } from "@/components/ui/icons/arrow-up-right";
import { CheckIcon } from "@/components/ui/icons/check";
import { getAssetLogo } from "@/lib/assets";
import type { ReceiptCard as Receipt } from "@/lib/chat";

function explorerHref(card: Receipt) {
  if (card.explorerUrl) return card.explorerUrl;
  if (card.txHash) {
    return `https://stellar.expert/explorer/testnet/tx/${card.txHash}`;
  }
  return null;
}

/**
 * Settled transfer, styled as a torn-off receipt slip: brand header carrying the
 * amount, details on the paper below, perforation before the explorer link.
 */
export function ReceiptCard({ card }: { card: Receipt }) {
  const href = explorerHref(card);
  const logo = card.balance.badge ? getAssetLogo(card.balance.badge) : null;
  // The header already states the amount, so the lead-less stat the backend
  // sends alongside it would only repeat it. The network fee is dropped on the
  // client's call — it is not something the sender acts on.
  const rows = card.stats.filter(
    (stat) => stat.lead && !/\bfee\b/i.test(stat.lead),
  );

  return (
    <div className="w-full overflow-hidden rounded-surface bg-jumpa-white shadow-xs">
      <div className="relative bg-[image:var(--gradient-jumpa-receipt)] px-3.5 pt-3.5 pb-4">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[image:var(--gradient-jumpa-receipt-glow)]"
        />

        <div className="relative flex items-center justify-between gap-2">
          <span className="flex min-w-0 items-center gap-1.5">
            <span className="flex size-4.5 shrink-0 items-center justify-center rounded-pill bg-jumpa-alt-400">
              <CheckIcon className="size-3 text-jumpa-alt-950" />
            </span>
            <span className="truncate text-[11px] leading-4 font-semibold text-jumpa-white">
              {card.title}
            </span>
          </span>
          <span className="shrink-0 rounded-pill bg-jumpa-white/15 px-2 py-0.5 text-[11px] leading-3.5 font-medium text-jumpa-alt-400">
            {card.status}
          </span>
        </div>

        <div className="relative mt-3 flex items-center justify-between gap-2">
          <span className="min-w-0 truncate text-2xl leading-7 font-semibold text-jumpa-white">
            {card.balance.value}
          </span>
          {card.balance.badge ? (
            <span className="flex shrink-0 items-center gap-1.5 rounded-pill bg-jumpa-white/15 py-1 pr-2.5 pl-1">
              {logo ? (
                <Image
                  src={logo}
                  alt=""
                  width={18}
                  height={18}
                  className="size-4.5 rounded-full object-contain"
                />
              ) : null}
              <span className="text-[11px] leading-4 font-semibold text-jumpa-white">
                {card.balance.badge}
              </span>
            </span>
          ) : null}
        </div>
      </div>

      {rows.length > 0 ? (
        <dl className="flex flex-col gap-1.5 px-3.5 pt-3.5 pb-3">
          {rows.map((stat, index) => (
            <div
              key={`${stat.lead}-${stat.value}-${index}`}
              className="flex items-baseline justify-between gap-3"
            >
              <dt className="shrink-0 text-[10px] leading-4 font-medium tracking-wide text-jumpa-neutral-350 uppercase">
                {stat.lead?.trim()}
              </dt>
              <dd className="min-w-0 truncate text-[11px] leading-4 font-medium text-jumpa-black">
                {stat.value}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}

      {href ? (
        <>
          {/* Perforation, so the slip reads as something torn off. */}
          <span aria-hidden="true" className="rule-dashed block h-px w-full" />
          <div className="px-3.5 pt-3 pb-3.5">
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="flex h-9 items-center justify-center gap-1.5 rounded-pill bg-jumpa-primary-50 text-[11px] leading-4 font-semibold text-jumpa-primary-700 transition-colors hover:bg-jumpa-primary-100"
            >
              Verify on Explorer
              <ArrowUpRightIcon className="size-3" />
            </a>
          </div>
        </>
      ) : null}
    </div>
  );
}

/* Previous lime-slab receipt, kept for reference. Restore the imports from
   "@/components/chat/chat-card" alongside it.

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
*/
