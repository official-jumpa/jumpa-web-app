"use client";

import { useEffect, useState } from "react";
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

/** Shared with `ActionRow`'s pair, so the two read as the same control. */
const PILL =
  "tap flex h-8 items-center justify-center rounded-panel text-sm leading-4 font-medium active:scale-95 disabled:opacity-50";

interface OnrampCheckoutCardProps {
  card: OnrampCard;
  onPaid?: () => void;
  /** Drops the order, same handler the other pending cards cancel through. */
  onCancel?: () => void;
}

/** Buying crypto with a bank transfer: pay this account, then say you have. */
export function OnrampCheckoutCard({
  card,
  onPaid,
  onCancel,
}: OnrampCheckoutCardProps) {
  const [verifying, setVerifying] = useState(false);
  const isAlreadyDone =
    card.status === "confirmed" || card.status === "completed";
  const [isDone, setIsDone] = useState(isAlreadyDone);
  const [statusError, setStatusError] = useState<string | null>(null);

  const isError = card.status === "error";

  // Avoid frequent data fetches — only query if the transaction is not already completed
  useEffect(() => {
    if (isDone || isAlreadyDone || !card.reference) return;

    let isMounted = true;
    fetch(`/api/onramp/status?reference=${encodeURIComponent(card.reference)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (isMounted && data?.success && data.isCompleted) {
          setIsDone(true);
          onPaid?.();
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [card.reference, isDone, isAlreadyDone, onPaid]);

  const handleConfirmPaid = async () => {
    setVerifying(true);
    setStatusError(null);

    try {
      const res = await fetch(
        `/api/onramp/status?reference=${encodeURIComponent(card.reference)}`,
      );
      const data = await res.json();

      if (data.success && data.isCompleted) {
        setIsDone(true);
        onPaid?.();
      } else if (data.success && data.isProcessing) {
        setStatusError(data.message || "Deposit received. Processing payout…");
      } else if (data.success && data.isAwaitingDeposit) {
        setStatusError(
          "We haven't seen your transfer yet. It can take a minute to show up — if you've already sent it, check again shortly.",
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
        <div className="mt-1.5 flex gap-1.75 self-start">
          {onCancel ? (
            <button
              type="button"
              onClick={onCancel}
              disabled={verifying}
              className={`${PILL} bg-jumpa-neutral-750 px-4 text-jumpa-neutral-275`}
            >
              Cancel
            </button>
          ) : null}
          <button
            type="button"
            onClick={handleConfirmPaid}
            disabled={verifying}
            className={`${PILL} gap-2 bg-jumpa-primary-600 px-4 text-jumpa-neutral-25`}
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
        </div>
      )}
    </>
  );
}
