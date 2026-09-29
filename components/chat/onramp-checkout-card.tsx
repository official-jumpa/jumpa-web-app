"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
import { formatAmount } from "@/lib/transfer";

/** Shared with `ActionRow`'s pair, so the two read as the same control. */
const PILL =
  "tap flex h-8 items-center justify-center rounded-panel text-sm leading-4 font-medium active:scale-95 disabled:opacity-50";

/**
 * Where the order is. `delivering` is its own phase because the naira can land
 * well before the token does — the custom XLM onramp settles from treasury
 * after the deposit confirms, and that step used to read as "awaiting transfer".
 */
type Phase = "awaiting" | "delivering" | "done" | "failed" | "error";

const STATUS: Record<
  Phase,
  { label: string; tone: "pending" | "done" | "failed" }
> = {
  awaiting: { label: "Awaiting transfer", tone: "pending" },
  delivering: { label: "Delivering", tone: "pending" },
  done: { label: "Completed", tone: "done" },
  failed: { label: "Failed", tone: "failed" },
  error: { label: "Error", tone: "failed" },
};

/** The status route is what triggers settlement, so a pending card keeps asking. */
const POLL_MS = 12_000;
/** ~10 minutes of it, then the button carries on by hand. */
const POLL_LIMIT = 50;

/** Groups a figure, and leaves "Calculating…" or a dash alone. */
function amountText(value: string): string {
  return value && Number.isFinite(Number(value)) ? formatAmount(value) : value;
}

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
  const [phase, setPhase] = useState<Phase>(() =>
    card.status === "confirmed" || card.status === "completed"
      ? "done"
      : card.status === "error"
        ? "error"
        : "awaiting",
  );
  const [notice, setNotice] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  // Held in a ref so a parent re-rendering its handler cannot restart the poll.
  const paidRef = useRef(onPaid);
  paidRef.current = onPaid;

  const pending = phase === "awaiting" || phase === "delivering";

  const check = useCallback(
    async (manual: boolean) => {
      if (!card.reference) return;
      if (manual) {
        setChecking(true);
        setNotice(null);
      }

      try {
        const res = await fetch(
          `/api/onramp/status?reference=${encodeURIComponent(card.reference)}`,
        );
        const data = await res.json();

        if (data?.success && data.isCompleted) {
          setPhase("done");
          setNotice(null);
          paidRef.current?.();
        } else if (data?.success && data.isFailed) {
          setPhase("failed");
          setNotice(
            data.message ||
              "This order expired. Start a new deposit to try again.",
          );
        } else if (data?.success && data.isProcessing) {
          setPhase("delivering");
          setNotice(
            data.message ||
              "Transfer received. Sending your tokens across now…",
          );
        } else if (manual) {
          setNotice(
            data?.success && data.isAwaitingDeposit
              ? "We haven't seen your transfer yet — it can take a minute to show up. We'll keep checking."
              : data?.message ||
                  data?.error ||
                  "Could not verify payment. Try again.",
          );
        }
      } catch {
        if (manual)
          setNotice("Network error checking status. Please try again.");
      } finally {
        if (manual) setChecking(false);
      }
    },
    [card.reference],
  );

  // Settlement only happens when something asks for the status, so the card asks
  // on its own rather than leaving the user to press the button again. `pending`
  // is a boolean, so awaiting → delivering does not restart the interval.
  useEffect(() => {
    if (!pending || !card.reference) return;

    let polls = 0;
    check(false);
    const timer = setInterval(() => {
      polls += 1;
      if (polls >= POLL_LIMIT) {
        clearInterval(timer);
        return;
      }
      check(false);
    }, POLL_MS);

    return () => clearInterval(timer);
  }, [pending, card.reference, check]);

  const status = STATUS[phase];

  return (
    <>
      <ChatCard>
        <CardTitle title={card.title || "Buy Crypto/Deposit"}>
          <CardStatusPill status={status} />
        </CardTitle>

        <CardRule />

        <CardAmount
          row={{
            caption: "YOU PAY",
            value: amountText(card.fiatAmount),
            badge: card.fiatCurrency || "NGN",
          }}
        />
        <CardAmount
          row={{
            caption: "YOU RECEIVE",
            value:
              card.cryptoAmount === "—"
                ? "Calculating…"
                : amountText(card.cryptoAmount),
            badge: card.cryptoToken,
          }}
        />

        {phase === "error" ? (
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
              action: {
                label: phase === "done" ? "View details" : "Copy",
                kind: "copy",
              },
            }}
          />
        )}

        {/* Instructions, so they go once there is nothing left to do. */}
        {pending && card.notes && card.notes.length > 0 ? (
          <RampNotes notes={card.notes} />
        ) : null}

        {notice ? (
          <RampNotice tone={phase === "failed" ? "error" : "pending"}>
            {notice}
          </RampNotice>
        ) : null}

        {card.reference ? (
          <>
            <CardRule />
            <ReferenceLine reference={card.reference} />
          </>
        ) : null}
      </ChatCard>

      {pending ? (
        <div className="mt-1.5 flex gap-1.75 self-start">
          {/* Nothing to cancel once the money has landed. */}
          {onCancel && phase === "awaiting" ? (
            <button
              type="button"
              onClick={onCancel}
              disabled={checking}
              className={`${PILL} bg-jumpa-neutral-750 px-4 text-jumpa-neutral-275`}
            >
              Cancel
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => check(true)}
            disabled={checking}
            className={`${PILL} gap-2 bg-jumpa-primary-600 px-4 text-jumpa-neutral-25`}
          >
            {checking ? (
              <>
                <span className="size-3 animate-spin rounded-full border-2 border-jumpa-white border-t-transparent" />
                Checking…
              </>
            ) : phase === "delivering" ? (
              "Refresh status"
            ) : (
              "I've sent the money"
            )}
          </button>
        </div>
      ) : null}
    </>
  );
}
