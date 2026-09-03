"use client";

import { useState } from "react";
import { DetailPanel } from "@/components/chat/card-rows";
import {
  CardAmount,
  CardRule,
  CardStatusPill,
  CardTitle,
  ChatCard,
  ReferenceLine,
} from "@/components/chat/chat-card";
import { RampNotes, RampNotice } from "@/components/chat/ramp-parts";
import type { OnrampCard } from "@/lib/chat";

interface OnrampCheckoutCardProps {
  card: OnrampCard;
  onPaid?: () => void;
}

/** Buying crypto with a bank transfer: pay this account, then say you have. */
export function OnrampCheckoutCard({ card, onPaid }: OnrampCheckoutCardProps) {
  const [verifying, setVerifying] = useState(false);
  const [isDone, setIsDone] = useState(card.status === "confirmed");
  const [statusError, setStatusError] = useState<string | null>(null);

  const isError = card.status === "error";

  const handleConfirmPaid = async () => {
    setVerifying(true);
    setStatusError(null);

    try {
      const res = await fetch(
        `/api/switch/status?reference=${encodeURIComponent(card.reference)}`,
      );
      const data = await res.json();

      if (data.success && data.isCompleted) {
        setIsDone(true);
        onPaid?.();
      } else if (data.success && data.isAwaiting) {
        setStatusError(
          data.message ||
            "Payment awaiting deposit. If you have already transferred, please allow a moment for confirmation.",
        );
      } else {
        setStatusError(
          data.message || data.error || "Could not verify payment. Try again.",
        );
      }
    } catch {
      setStatusError("Network error checking status. Please try again.");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <>
      <ChatCard>
        <CardTitle title={card.title || "Buy Crypto/Deposit"}>
          <CardStatusPill
            status={{
              label: isDone
                ? "Completed"
                : isError
                  ? "Error"
                  : "Awaiting transfer",
              tone: isDone ? "done" : "pending",
            }}
          />
        </CardTitle>

        <CardRule />

        <CardAmount
          row={{
            caption: "YOU PAY",
            value: card.fiatAmount,
            badge: card.fiatCurrency || "NGN",
          }}
        />
        <CardAmount
          row={{
            caption: "YOU RECEIVE",
            value:
              card.cryptoAmount === "—" ? "Calculating…" : card.cryptoAmount,
            badge: card.cryptoToken,
          }}
        />

        {isError ? (
          <RampNotice tone="error">
            Could not load bank details. Please try again.
          </RampNotice>
        ) : (
          <DetailPanel
            details={{
              lines: [
                { label: "Bank Name", value: card.bankName },
                { label: "Account Name", value: card.accountName },
              ],
              field: {
                caption: "ACCOUNT NUMBER",
                value: card.accountNumber,
              },
              action: { label: isDone ? "View details" : "Copy", kind: "copy" },
            }}
          />
        )}

        {card.notes && card.notes.length > 0 ? (
          <RampNotes notes={card.notes} />
        ) : null}

        {statusError ? (
          <RampNotice tone="pending">{statusError}</RampNotice>
        ) : null}

        {card.reference ? (
          <>
            <CardRule />
            <ReferenceLine reference={card.reference} />
          </>
        ) : null}
      </ChatCard>

      {isDone || isError ? null : (
        <button
          type="button"
          onClick={handleConfirmPaid}
          disabled={verifying}
          className="tap mt-1.5 flex h-8 items-center justify-center gap-2 self-start rounded-panel bg-jumpa-primary-600 px-4 text-sm leading-4 font-medium text-jumpa-neutral-25 active:scale-95 disabled:opacity-50"
        >
          {verifying ? (
            <>
              <span className="size-3 animate-spin rounded-full border-2 border-jumpa-white border-t-transparent" />
              Verifying…
            </>
          ) : (
            "I've sent the money"
          )}
        </button>
      )}
    </>
  );
}
