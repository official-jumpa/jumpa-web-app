"use client";

import { useState } from "react";
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
  const [copied, setCopied] = useState<"address" | "reference" | null>(null);
  const isDone = card.status === "confirmed";
  const isError = card.status === "error";

  const handleCopy = (value: string, key: "address" | "reference") => {
    navigator.clipboard.writeText(value);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <ChatCard className="border border-jumpa-neutral-100 bg-jumpa-white">
      <CardTitle title={card.title || "Withdrawal / Cash Out"}>
        <span
          className={`text-xs font-bold px-2 py-0.5 rounded-pill ${
            isDone
              ? "bg-jumpa-alt-400 text-jumpa-secondary-600"
              : isError
              ? "bg-red-100 text-red-700"
              : "bg-jumpa-secondary-100 text-jumpa-primary-950"
          }`}
        >
          {isDone ? "Completed" : isError ? "Error" : "Pending"}
        </span>
      </CardTitle>

      <CardRule />

      {/* Crypto & Fiat Rows */}
      <div className="flex flex-col gap-1.5">
        <CardAmount
          row={{
            caption: "YOU SEND",
            value: card.cryptoAmount,
            badge: card.cryptoToken,
          }}
        />
        <CardAmount
          row={{
            caption: "YOU RECEIVE",
            value: card.fiatAmount === "—" ? "Calculating..." : `₦${card.fiatAmount}`,
            badge: "NGN",
          }}
        />
      </div>

      {card.asset && (
        <p className="text-center text-xs text-jumpa-black/40 font-medium -mt-1">
          from <span className="font-semibold text-jumpa-black/60">{card.asset}</span>
        </p>
      )}

      <CardRule />

      {/* Switch Deposit Address */}
      {card.depositAddress && (
        <div className="rounded-xl border border-jumpa-neutral-150 bg-jumpa-neutral-95 p-3 flex flex-col gap-2">
          <span className="text-xs font-bold uppercase text-jumpa-black/50">
            Send Asset To This Address
          </span>

          <div className="flex items-start justify-between gap-2">
            <span className="text-[12px] font-mono font-bold text-jumpa-primary-950 break-all leading-relaxed">
              {card.depositAddress}
            </span>
            <button
              type="button"
              onClick={() => handleCopy(card.depositAddress!, "address")}
              className="shrink-0 flex items-center gap-1 rounded-pill bg-jumpa-primary-600 px-3 py-1 text-[12px] font-semibold text-jumpa-white transition-transform active:scale-95 cursor-pointer shadow-xs"
            >
              {copied === "address" ? "✓ Copied" : "Copy"}
            </button>
          </div>
        </div>
      )}

      {/* Receiver's Bank Account */}
      <div className="rounded-xl border border-jumpa-neutral-150 bg-jumpa-neutral-95 p-3 flex flex-col gap-2">
        <span className="text-xs font-bold uppercase text-jumpa-black/50">
          Recipient Bank Account
        </span>

        <div className="flex items-center justify-between">
          <span className="text-xs text-jumpa-black/60 font-medium">Bank</span>
          <span className="text-[13px] font-bold text-jumpa-black">{card.bankName}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-jumpa-black/60 font-medium">Account Name</span>
          <span className="text-[13px] font-semibold text-jumpa-black truncate max-w-36">
            {card.accountName}
          </span>
        </div>

        <div className="flex items-center justify-between pt-1 border-t border-jumpa-neutral-200">
          <span className="text-xs text-jumpa-black/60 font-medium">Account Number</span>
          <span className="text-[13px] font-mono font-bold text-jumpa-primary-950">
            {card.accountNumber}
          </span>
        </div>
      </div>

      {/* Reference */}
      {card.reference && (
        <div className="flex items-center justify-between rounded-lg border border-jumpa-neutral-150 bg-jumpa-neutral-95 px-3 py-2">
          <p className="text-xs text-jumpa-black/50">
            Reference:{" "}
            <span className="font-mono font-bold text-jumpa-black">{card.reference}</span>
          </p>
          <button
            type="button"
            onClick={() => handleCopy(card.reference!, "reference")}
            className="text-[11px] font-bold text-jumpa-primary-600 ml-2"
          >
            {copied === "reference" ? "✓" : "Copy"}
          </button>
        </div>
      )}

      {/* Error notice */}
      {isError && (
        <p className="text-xs text-red-600 text-center font-medium">
          Could not process withdrawal. Please try again.
        </p>
      )}

      {/* Instruction when pending and no error */}
      {!isDone && !isError && card.depositAddress && (
        <p className="text-center text-[11px] text-jumpa-black/50 leading-relaxed">
          Send the exact asset amount to the address above. Your bank account will be credited once confirmed.
        </p>
      )}
    </ChatCard>
  );
}
