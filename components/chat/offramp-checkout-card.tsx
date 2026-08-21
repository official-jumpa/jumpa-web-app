"use client";

import {
  CardAmount,
  CardRule,
  CardTitle,
  ChatCard,
} from "@/components/chat/chat-card";
import type { OfframpCard } from "@/lib/chat";

interface OfframpCheckoutCardProps {
  card: OfframpCard;
}

export function OfframpCheckoutCard({ card }: OfframpCheckoutCardProps) {
  const isDone = card.status === "confirmed";

  return (
    <ChatCard className="border border-jumpa-neutral-100 bg-jumpa-white">
      <CardTitle title={card.title || "Withdrawal / Cash Out"}>
        <span
          className={`text-xs font-bold px-2 py-0.5 rounded-pill ${
            isDone
              ? "bg-jumpa-alt-400 text-jumpa-secondary-600"
              : "bg-jumpa-secondary-100 text-jumpa-primary-950"
          }`}
        >
          {isDone ? "Completed" : "Pending"}
        </span>
      </CardTitle>

      <CardRule />

      {/* Crypto & Fiat Rows */}
      <div className="flex flex-col gap-1.5">
        <CardAmount
          row={{
            caption: "YOU SELL",
            value: card.cryptoAmount,
            badge: card.cryptoToken,
          }}
        />
        <CardAmount
          row={{
            caption: "YOU RECEIVE",
            value: card.fiatAmount,
            badge: card.fiatCurrency,
          }}
        />
      </div>

      <CardRule />

      {/* Receivers Bank Account Box */}
      <div className="rounded-xl border border-jumpa-neutral-150 bg-jumpa-neutral-95 p-3 flex flex-col gap-2">
        <span className="text-xs font-bold uppercase text-jumpa-black/50">
          Receiver's Bank Account
        </span>

        <div className="flex items-center justify-between">
          <span className="text-xs text-jumpa-black/60 font-medium">
            Bank
          </span>
          <span className="text-[13px] font-bold text-jumpa-black">
            {card.bankName}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-jumpa-black/60 font-medium">
            Account Name
          </span>
          <span className="text-[13px] font-semibold text-jumpa-black truncate max-w-36">
            {card.accountName}
          </span>
        </div>

        <div className="flex items-center justify-between pt-1 border-t border-jumpa-neutral-200">
          <span className="text-xs text-jumpa-black/60 font-medium">
            Account Number
          </span>
          <span className="text-[13px] font-mono font-bold text-jumpa-primary-950">
            {card.accountNumber}
          </span>
        </div>
      </div>
    </ChatCard>
  );
}
