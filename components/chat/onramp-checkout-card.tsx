"use client";

import { useState } from "react";
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
  const [copied, setCopied] = useState<"account" | "reference" | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [isDone, setIsDone] = useState(card.status === "confirmed");
  const [statusError, setStatusError] = useState<string | null>(null);

  const handleCopy = (value: string, key: "account" | "reference") => {
    navigator.clipboard.writeText(value);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleConfirmPaid = async () => {
    setVerifying(true);
    setStatusError(null);

    console.log("[OnrampCheckoutCard] Checking payment status for reference:", card.reference);

    try {
      const res = await fetch(`/api/switch/status?reference=${encodeURIComponent(card.reference)}`);
      const data = await res.json();

      console.log("[OnrampCheckoutCard] Status response:", data);

      if (data.success && data.isCompleted) {
        setIsDone(true);
        setStatusError(null);
        onPaid?.();
      } else if (data.success && data.isAwaiting) {
        setStatusError(
          data.message ||
            "Payment awaiting deposit. If you have already transferred, please allow a moment for confirmation."
        );
      } else {
        setStatusError(data.message || data.error || "Could not verify payment. Please try again.");
      }
    } catch (err: any) {
      console.error("[OnrampCheckoutCard] Status check failed:", err.message);
      setStatusError("Network error checking status. Please try again.");
    } finally {
      setVerifying(false);
    }
  };

  const isError = card.status === "error";

  return (
    <ChatCard className="border border-jumpa-neutral-100 bg-jumpa-white">
      <CardTitle title={card.title || "Buy Crypto / Deposit"}>
        <span
          className={`text-xs font-bold px-2 py-0.5 rounded-pill ${
            isDone
              ? "bg-jumpa-alt-400 text-jumpa-secondary-600"
              : isError
              ? "bg-red-100 text-red-700"
              : "bg-jumpa-secondary-100 text-jumpa-primary-950"
          }`}
        >
          {isDone ? "Completed" : isError ? "Error" : "Awaiting Transfer"}
        </span>
      </CardTitle>

      <CardRule />

      {/* Fiat and Crypto summary */}
      <div className="flex flex-col gap-1.5">
        <CardAmount
          row={{
            caption: "YOU SEND",
            value: `₦${card.fiatAmount}`,
            badge: "NGN",
          }}
        />
        <CardAmount
          row={{
            caption: "YOU RECEIVE",
            value: card.cryptoAmount === "—" ? "Calculating..." : card.cryptoAmount,
            badge: card.cryptoToken,
          }}
        />
      </div>
{/* 
      {card.asset && (
        <p className="text-center text-xs text-jumpa-black/40 font-medium -mt-1">
          via <span className="font-semibold text-jumpa-black/60">{card.asset}</span>
        </p>
      )} */}

      <CardRule />

      {/* Bank Account Details Box */}
      <div className="rounded-xl border border-jumpa-neutral-150 bg-jumpa-neutral-95 p-3 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-jumpa-black/60 font-medium">Bank Name</span>
          <span className="text-[13px] font-bold text-jumpa-black">{card.bankName}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-jumpa-black/60 font-medium">Account Name</span>
          <span className="text-[13px] font-semibold text-jumpa-black truncate max-w-36">
            {card.accountName}
          </span>
        </div>

        <div className="flex items-center justify-between pt-1 border-t border-jumpa-neutral-200">
          <div className="flex flex-col">
            <span className="text-[11px] text-jumpa-black/50 font-bold uppercase">
              Account Number
            </span>
            <span className="text-sm font-bold tracking-wider text-jumpa-primary-950">
              {card.accountNumber}
            </span>
          </div>

          <button
            type="button"
            onClick={() => handleCopy(card.accountNumber, "account")}
            className="flex items-center gap-1 rounded-pill bg-jumpa-primary-600 px-3 py-1 text-[13px] font-semibold text-jumpa-white transition-transform active:scale-95 cursor-pointer shadow-xs"
          >
            {copied === "account" ? "Copied!" : "Copy"}
          </button>
        </div>
      </div>

      {/* Reference
      The user shouldn't see this. We should abstract it.
      I'm adding this comment so that when you read the code you will know the action I took.
       */}
      {/* {card.reference && !card.reference.startsWith("ERR-") && (
        <div className="flex items-center justify-between rounded-lg border border-jumpa-neutral-150 bg-jumpa-neutral-95 px-3 py-2">
          <p className="text-xs text-jumpa-black/50">
            Payment Reference:{" "}
            <span className="font-mono font-bold text-jumpa-black">{card.reference}</span>
          </p>
          <button
            type="button"
            onClick={() => handleCopy(card.reference, "reference")}
            className="text-[11px] font-bold text-jumpa-primary-600 ml-2"
          >
            {copied === "reference" ? "✓" : "Copy"}
          </button>
        </div>
      )} */}

      {/* Notes from Switch */}
      {card.notes && card.notes.length > 0 && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-2.5">
          {card.notes.map((note, i) => (
            <p key={i} className="text-[11px] text-amber-800 font-medium leading-relaxed">
              ⚠ {note}
            </p>
          ))}
        </div>
      )}

      {/* Error notice */}
      {isError && (
        <p className="text-xs text-red-600 text-center font-medium">
          Could not load bank details. Please try again.
        </p>
      )}

      {/* Status error */}
      {statusError && (
        <p className="text-xs text-orange-600 text-center font-medium">{statusError}</p>
      )}

      {/* Action Buttons */}
      {!isDone && !isError && (
        <div className="mt-1">
          <button
            type="button"
            onClick={handleConfirmPaid}
            disabled={verifying}
            className="flex h-9.5 w-full items-center justify-center rounded-pill bg-jumpa-primary-600 text-[13px] font-semibold text-jumpa-white transition-opacity hover:bg-jumpa-primary-700 active:scale-98 disabled:opacity-50 cursor-pointer shadow-xs"
          >
            {verifying ? (
              <span className="flex items-center gap-2">
                <span className="size-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Verifying...
              </span>
            ) : (
              "I have transferred the funds"
            )}
          </button>
        </div>
      )}
    </ChatCard>
  );
}
