import Link from "next/link";
import { useEffect, useState } from "react";
import { AgentAvatar } from "@/components/chat/agent-avatar";
import { MessageBubble } from "@/components/chat/message-bubble";
import { FaqList } from "@/components/support/faq-list";
import { StatusChip } from "@/components/support/status-chip";
import { ChevronRightIcon } from "@/components/ui/icons/chevron-right";
import { cn } from "@/lib/cn";
import { faqsFor, supportHref } from "@/lib/support";
import {
  CATEGORY_LABEL,
  isOpenTicket,
  TICKET_CATEGORIES,
  type TicketCategory,
  type TicketSummary,
} from "@/lib/support-tickets";

const GREETING =
  "Hi, you're through to Jumpa Support. Tell us what's going on — the assistant answers straight away, and a person from the team can take over whenever you need.";

/** Open conversations shown above a new one, so nobody starts a duplicate. */
const RESUME_LIMIT = 2;

const CHIP =
  "tap h-8 rounded-pill px-3.5 text-xs leading-4 font-medium active:scale-95";
const CHIP_TONE = {
  resting: "bg-jumpa-primary-50 text-jumpa-primary-600",
  picked: "bg-jumpa-primary-600 text-jumpa-white",
};

/** A new conversation before its first message: what it's about, and answers that might do. */
export function ConversationStart({
  category,
  onCategory,
  onShareTransaction,
}: {
  category: TicketCategory | null;
  onCategory: (category: TicketCategory | null) => void;
  onShareTransaction: () => void;
}) {
  const answers = faqsFor(category, { fallback: false });

  return (
    <div className="flex flex-col">
      <OpenConversations />

      <div className="flex items-start gap-1.5">
        <AgentAvatar />
        <div className="flex max-w-[80%] min-w-0 flex-col items-start gap-1.5">
          <span className="text-xs leading-4 font-medium text-jumpa-neutral-500">
            Assistant
          </span>
          <MessageBubble from="agent" paragraph>
            {GREETING}
          </MessageBubble>
        </div>
      </div>

      <section aria-labelledby="support-topic" className="mt-5 pl-11">
        <h2
          id="support-topic"
          className="text-xs leading-4 font-medium text-jumpa-neutral-500"
        >
          What's it about?
        </h2>
        <div className="mt-2 flex flex-wrap gap-2">
          {TICKET_CATEGORIES.map((option) => {
            const picked = category === option;
            return (
              <button
                key={option}
                type="button"
                aria-pressed={picked}
                onClick={() => {
                  onCategory(picked ? null : option);
                  if (!picked && option === "transaction") onShareTransaction();
                }}
                className={cn(
                  CHIP,
                  picked ? CHIP_TONE.picked : CHIP_TONE.resting,
                )}
              >
                {CATEGORY_LABEL[option]}
              </button>
            );
          })}
        </div>
      </section>

      {answers.length ? (
        <section
          aria-labelledby="support-answers"
          className="mt-5 animate-rise"
        >
          <h2
            id="support-answers"
            className="mb-2 text-xs leading-4 font-medium text-jumpa-neutral-500"
          >
            These might answer it
          </h2>
          <FaqList items={answers} />
        </section>
      ) : null}
    </div>
  );
}

function OpenConversations() {
  const [open, setOpen] = useState<TicketSummary[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/support/tickets", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { tickets?: TicketSummary[] } | null) => {
        if (cancelled || !data?.tickets) return;
        setOpen(
          data.tickets
            .filter((t) => isOpenTicket(t.status))
            .slice(0, RESUME_LIMIT),
        );
      })
      .catch(() => {
        // Only a shortcut; a new conversation still works without it.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!open.length) return null;

  return (
    <section aria-labelledby="support-resume" className="mb-6 animate-rise">
      <h2
        id="support-resume"
        className="mb-2 text-xs leading-4 font-medium text-jumpa-neutral-500"
      >
        Pick up where you left off
      </h2>
      <ul className="flex flex-col gap-2">
        {open.map((ticket) => (
          <li key={ticket.id}>
            <Link
              prefetch
              href={supportHref("chat", { ticket: ticket.id })}
              className="tap flex items-center gap-3 rounded-surface bg-jumpa-neutral-50 px-4 py-3 ring-1 ring-jumpa-neutral-60 ring-inset active:scale-[0.99]"
            >
              <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                <span className="truncate text-sm leading-4 font-semibold text-jumpa-black">
                  {ticket.subject}
                </span>
                <span className="flex">
                  <StatusChip status={ticket.status} />
                </span>
              </span>
              <ChevronRightIcon className="size-5 shrink-0 text-jumpa-neutral-500" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
