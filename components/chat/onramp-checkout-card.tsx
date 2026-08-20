"use client";

import { useState } from "react";
import Image from "next/image";
import {
  CardAmount,
  CardRule,
  CardTitle,
  ChatCard,
} from "@/components/chat/chat-card";
import type { OnrampCard } from "@/lib/chat";
import { getAssetLogo } from "@/lib/assets";

interface OnrampCheckoutCardProps {
  card: OnrampCard;
  onPaid?: () => void;
}

export function OnrampCheckoutCard({ card, onPaid }: OnrampCheckoutCardProps) {
  const [copied, setCopied] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [isDone, setIsDone] = useState(card.status === "confirmed");

  const logo = getAssetLogo(card.cryptoToken);

  const handleCopy = () => {
    navigator.clipboard.writeText(card.accountNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleConfirmPaid = () => {
    setVerifying(true);
    setTimeout(() => {
      setVerifying(false);
      setIsDone(true);
      onPaid?.();
    }, 1500);
  };

  return (
    <ChatCard className="border border-jumpa-neutral-100 bg-jumpa-white">
      <CardTitle title={card.title || "Buy Crypto / Deposit"}>
        <span
          className={`text-[10px] font-bold px-2 py-0.5 rounded-pill ${
            isDone
              ? "bg-jumpa-alt-400 text-jumpa-secondary-600"
              : "bg-jumpa-secondary-100 text-jumpa-primary-950"
          }`}
        >
          {isDone ? "Completed" : "Awaiting Transfer"}
        </span>
      </CardTitle>

      <CardRule />

      {/* Fiat and Crypto summary */}
      <div className="flex flex-col gap-1.5">
        <CardAmount
          row={{
            caption: "YOU SEND",
            value: card.fiatAmount,
            badge: card.fiatCurrency,
          }}
        />
        <CardAmount
          row={{
            caption: "YOU RECEIVE",
            value: card.cryptoAmount,
            badge: card.cryptoToken,
          }}
        />
      </div>

      <CardRule />

      {/* Bank Account Details Box */}
      <div className="rounded-xl border border-jumpa-neutral-150 bg-jumpa-neutral-95 p-3 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-jumpa-black/60 font-medium">
            Bank Name
          </span>
          <span className="text-xs font-bold text-jumpa-black">
            {card.bankName}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-[10px] text-jumpa-black/60 font-medium">
            Account Name
          </span>
          <span className="text-xs font-semibold text-jumpa-black truncate max-w-36">
            {card.accountName}
          </span>
        </div>

        <div className="flex items-center justify-between pt-1 border-t border-jumpa-neutral-200">
          <div className="flex flex-col">
            <span className="text-[9px] text-jumpa-black/50 font-bold uppercase">
              Account Number
            </span>
            <span className="text-sm font-bold tracking-wider text-jumpa-primary-950">
              {card.accountNumber}
            </span>
          </div>

          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1 rounded-pill bg-jumpa-primary-600 px-3 py-1 text-xs font-semibold text-jumpa-white transition-transform active:scale-95 cursor-pointer shadow-xs"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      </div>

      {card.reference && (
        <p className="text-center text-[10px] text-jumpa-black/50">
          Payment Reference:{" "}
          <span className="font-mono font-bold text-jumpa-black">
            {card.reference}
          </span>
        </p>
      )}

      {/* Action Button */}
      {!isDone && (
        <button
          type="button"
          onClick={handleConfirmPaid}
          disabled={verifying}
          className="mt-1 flex h-9.5 w-full items-center justify-center rounded-pill bg-jumpa-primary-600 text-xs font-semibold text-jumpa-white transition-opacity hover:bg-jumpa-primary-700 active:scale-98 disabled:opacity-50 cursor-pointer shadow-xs"
        >
          {verifying ? (
            <span className="flex items-center gap-2">
              <span className="size-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Verifying Deposit...
            </span>
          ) : (
            "I have transferred the funds"
          )}
        </button>
      )}
    </ChatCard>
  );
}
