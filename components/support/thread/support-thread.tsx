"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CopyButton } from "@/components/auth/copy-button";
import { ChatComposer } from "@/components/chat/chat-composer";
import { TypingIndicator } from "@/components/chat/typing-indicator";
import { Button } from "@/components/ui/button";
import { ReceiptAltIcon } from "@/components/ui/icons/receipt-alt";
import { XmarkIcon } from "@/components/ui/icons/xmark";
import { useSupportTicket } from "@/hooks/use-support-ticket";
import type { ChatAttachment } from "@/lib/chat-attachments";
import { supportHref } from "@/lib/support";
import {
  isHumanHeld,
  MESSAGE_MAX,
  type TicketCategory,
  type TicketStatus,
  type TicketTransaction,
  toTicketTransaction,
} from "@/lib/support-tickets";
import type { Transaction } from "@/lib/wallet";
import { ClosedFooter } from "./closed-footer";
import { ConversationStart } from "./conversation-start";
import { HandoffPrompt } from "./handoff-prompt";
import { PendingCard } from "./pending-card";
import { RatingCard } from "./rating-card";
import { StagedTransaction } from "./staged-transaction";
import { ThreadHeader } from "./thread-header";
import { ThreadMessages } from "./thread-messages";
import { TransactionPicker } from "./transaction-picker";
import { WaitingCard } from "./waiting-card";

function placeholderFor(status: TicketStatus | null): string {
  if (!status) return "Describe what's going on…";
  if (status === "resolved") return "Reply to reopen…";
  if (isHumanHeld(status)) return "Write to the team…";
  return "Ask anything…";
}

/**
 * `/support?view=chat`. One conversation with the assistant and, when it needs
 * one, a person from the team. `transactionId` starts it with that transaction
 * attached, from "Get help with this" on a receipt.
 */
export function SupportThread({
  ticketId,
  transactionId,
}: {
  ticketId: string | null;
  transactionId: string | null;
}) {
  const [draft, setDraft] = useState("");
  const [staged, setStaged] = useState<TicketTransaction | null>(null);
  const [category, setCategory] = useState<TicketCategory | null>(
    transactionId ? "transaction" : null,
  );
  const [picker, setPicker] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const foot = useRef<HTMLDivElement>(null);
  const settled = useRef(false);

  // The URL takes the new id without a navigation, so nothing remounts.
  const onCreated = useCallback((ticket: string) => {
    window.history.replaceState(null, "", supportHref("chat", { ticket }));
  }, []);

  const thread = useSupportTicket(ticketId, { onCreated });
  const { phase, ticket, messages, outbox } = thread;
  const status = ticket?.status ?? null;

  useEffect(() => {
    if (!transactionId) return;
    let cancelled = false;
    fetch(`/api/v1/transactions/${encodeURIComponent(transactionId)}`, {
      cache: "no-store",
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { transaction?: Transaction } | null) => {
        if (!cancelled && data?.transaction)
          setStaged(toTicketTransaction(data.transaction));
      })
      .catch(() => {
        // The user can still describe it, or attach it from the menu.
      });
    return () => {
      cancelled = true;
    };
  }, [transactionId]);

  const count = messages.length + outbox.length;

  // Follow the conversation down; the first jump is instant, after that it glides.
  // biome-ignore lint/correctness/useExhaustiveDependencies: count and status are the triggers
  useEffect(() => {
    if (!count) return;
    foot.current?.scrollIntoView({
      behavior: settled.current ? "smooth" : "auto",
      block: "end",
    });
    settled.current = true;
  }, [count, status]);

  const submit = (attachments?: ChatAttachment[], customText?: string) => {
    const text = (customText ?? draft).trim();
    const files = attachments ?? [];
    if (!text && !files.length && !staged) return;
    if (text.length > MESSAGE_MAX) {
      setNotice(
        `Keep it under ${MESSAGE_MAX.toLocaleString()} characters, or send it in parts.`,
      );
      return;
    }
    setNotice(null);
    thread.send({ text, attachments: files, transaction: staged, category });
    setDraft("");
    setStaged(null);
  };

  const pickTransaction = (transaction: Transaction) => {
    setStaged(toTicketTransaction(transaction));
    setCategory((current) => current ?? "transaction");
    setPicker(false);
  };

  const sending = outbox.some((m) => m.delivery === "sending");
  const fresh = phase === "new" && !count;
  const error = notice ?? thread.error;

  return (
    <div className="flex min-h-dvh flex-col px-4.5 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
      <ThreadHeader ticket={ticket} />

      <div className="mt-4 flex flex-1 flex-col">
        {phase === "loading" ? (
          <p className="mt-16 text-center text-sm text-jumpa-neutral-500">
            Loading conversation…
          </p>
        ) : phase === "missing" ? (
          <Missing />
        ) : (
          <>
            {/* The reference only matters once a person is involved. */}
            {ticket && ticket.status !== "ai" ? (
              <p className="mb-4 flex items-center justify-center gap-1.5 text-xs leading-4 text-jumpa-neutral-500">
                Ref {ticket.ref} ·
                <CopyButton
                  value={ticket.ref}
                  label="Copy"
                  name={`Copy reference ${ticket.ref}`}
                  variant="text"
                  className="font-semibold"
                />
              </p>
            ) : null}

            {fresh ? (
              <ConversationStart
                category={category}
                onCategory={setCategory}
                onShareTransaction={() => setPicker(true)}
              />
            ) : null}

            <ThreadMessages
              messages={messages}
              outbox={outbox}
              onRetry={thread.retry}
              onDiscard={thread.discard}
            />

            {sending && (!status || status === "ai") ? (
              // The indicator carries its own 14px gutter.
              <div className="-mx-3.5 mt-4">
                <TypingIndicator />
              </div>
            ) : null}

            {status === "requested" ? (
              <WaitingCard
                estimate={thread.estimate}
                category={ticket?.category ?? null}
              />
            ) : status === "pending" ? (
              <PendingCard dueAt={ticket?.slaDueAt ?? null} />
            ) : (status === "resolved" || status === "closed") && ticket ? (
              <RatingCard
                status={status}
                rating={ticket.rating}
                busy={thread.busy === "rate"}
                onRate={thread.rate}
              />
            ) : null}
          </>
        )}
        <div ref={foot} />
      </div>

      {phase === "loading" || phase === "missing" ? null : (
        <div className="sticky bottom-0 mt-4 flex flex-col gap-2 bg-jumpa-white pt-2">
          {error ? (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-surface bg-jumpa-danger-50 py-2.5 pr-2 pl-3.5 text-xs leading-4.5 text-jumpa-neutral-775"
            >
              <span className="flex-1 pt-1">{error}</span>
              <button
                type="button"
                aria-label="Dismiss"
                onClick={() => {
                  setNotice(null);
                  thread.clearError();
                }}
                className="tap flex size-7 shrink-0 items-center justify-center rounded-full"
              >
                <XmarkIcon className="size-3.5" />
              </button>
            </div>
          ) : null}

          {status === "ai" ? (
            <HandoffPrompt
              busy={thread.busy === "escalate"}
              onEscalate={thread.escalate}
            />
          ) : null}

          {staged ? (
            <StagedTransaction
              transaction={staged}
              onRemove={() => setStaged(null)}
            />
          ) : null}

          {status === "closed" ? (
            <ClosedFooter />
          ) : (
            <ChatComposer
              value={draft}
              onChange={setDraft}
              onSend={submit}
              tone="plain"
              autoFocus={false}
              staged={!!staged}
              placeholder={placeholderFor(status)}
              menuExtras={[
                {
                  id: "transaction",
                  Icon: ReceiptAltIcon,
                  title: "Transaction",
                  onPick: () => setPicker(true),
                },
              ]}
            />
          )}
        </div>
      )}

      {picker ? (
        <TransactionPicker
          onPick={pickTransaction}
          onClose={() => setPicker(false)}
        />
      ) : null}
    </div>
  );
}

function Missing() {
  return (
    <div className="mt-16 flex flex-col items-center gap-2 text-center">
      <h2 className="text-base leading-6 font-semibold text-jumpa-black">
        This conversation isn't available
      </h2>
      <p className="max-w-70 text-sm leading-5 text-jumpa-neutral-500">
        It may belong to another account, or the link is incomplete.
      </p>
      <div className="mt-6 flex w-full flex-col gap-2">
        <Button href={supportHref("chat")} variant="gradient" size="lg">
          Start a new conversation
        </Button>
        <Button href={supportHref("messages")} variant="soft" size="lg">
          Your messages
        </Button>
      </div>
    </div>
  );
}
