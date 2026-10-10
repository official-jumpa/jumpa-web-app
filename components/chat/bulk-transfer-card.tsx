"use client";

import {
  CardAmount,
  CardRule,
  CardStatusPill,
  CardTitle,
  ChatCard,
} from "@/components/chat/chat-card";
import { BankIcon } from "@/components/ui/icons/bank";
import type { BulkTransferCard as BulkCard } from "@/lib/chat";

interface BulkTransferCardProps {
  card: BulkCard;
  onReply?: (reply: string) => void;
}

/** Multi-recipient transfer proposal: displays consolidated total & recipient breakdown */
export function BulkTransferCard({ card }: BulkTransferCardProps) {
  const isDone = card.status === "confirmed";
  const isError = card.status === "error";
  const isCancelled = card.status === "cancelled";
  const settled = isDone || isError || isCancelled;

  const recipients = Array.isArray(card.recipients) ? card.recipients : [];

  return (
    <ChatCard>
      <CardTitle title={card.title || `Bulk Transfer (${recipients.length} Recipients)`}>
        {settled ? (
          <CardStatusPill
            status={{
              label: isDone ? "Completed" : isCancelled ? "Cancelled" : "Error",
              tone: isDone ? "done" : "pending",
            }}
          />
        ) : null}
      </CardTitle>

      <CardRule />

      {/* Primary Total Amount */}
      <CardAmount
        row={{
          caption: "TOTAL AMOUNT",
          value: card.totalAmount,
          badge: card.currency || "NGN",
        }}
      />

      {/* Funding Source line */}
      <div className="flex items-center justify-between px-3 py-1 text-xs">
        <span className="font-medium text-jumpa-neutral-600">Funding source</span>
        <span className="font-semibold text-jumpa-black">{card.sourceLabel || card.source}</span>
      </div>

      <CardRule />

      {/* Tab Switcher / Carousel Header */}
      {recipients.length > 1 && (
        <div className="flex items-center justify-between px-3 pt-2">
          <span className="text-[10px] font-semibold tracking-wider uppercase text-jumpa-neutral-500">
            Recipients ({recipients.length})
          </span>
          <div className="flex items-center gap-1 rounded-lg bg-jumpa-neutral-100 p-0.5 text-[11px] font-medium text-jumpa-neutral-600">
            {recipients.map((_, i) => (
              <span
                key={i}
                className="flex size-5 items-center justify-center rounded-md bg-jumpa-white text-jumpa-black shadow-xs font-semibold"
              >
                {i + 1}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* List of individual recipients */}
      <div className="flex flex-col gap-2 p-1">
        {recipients.map((rec, idx) => {
          const isCrypto =
            rec.accountNumber.startsWith("G") ||
            rec.accountNumber.startsWith("0x") ||
            rec.accountNumber.length > 20;

          return (
            <div
              key={`${rec.accountNumber}-${idx}`}
              className="flex items-center justify-between rounded-xl border border-jumpa-neutral-100 bg-jumpa-neutral-50 p-2.5 transition-all"
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-jumpa-primary-100 text-jumpa-primary-700">
                  <BankIcon className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-jumpa-black">
                    {rec.accountName || `Recipient ${idx + 1}`}
                  </p>
                  <p className="truncate text-[10px] text-jumpa-neutral-600">
                    {rec.bankName || "On-Chain"} •{" "}
                    {isCrypto
                      ? `${rec.accountNumber.slice(0, 6)}...${rec.accountNumber.slice(-4)}`
                      : rec.accountNumber}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-jumpa-black">
                  {card.currency === "NGN" ? "₦" : ""}
                  {rec.amount} {card.currency !== "NGN" ? card.currency : ""}
                </p>
                {rec.cryptoAmount && card.currency === "NGN" && (
                  <p className="text-[10px] text-jumpa-neutral-500">
                    ≈ {rec.cryptoAmount} {rec.cryptoToken}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {card.feeAmount && card.feeAmount !== "₦0" && card.feeAmount !== "0" && (
        <div className="flex items-center justify-between px-3 pt-2 text-[11px] text-jumpa-neutral-600">
          <span>Total Fee:</span>
          <span className="font-medium text-jumpa-black">{card.feeAmount}</span>
        </div>
      )}
    </ChatCard>
  );
}
