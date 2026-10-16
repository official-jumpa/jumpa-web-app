"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SupportHeader } from "@/components/support/support-header";
import { Button } from "@/components/ui/button";
import { CheckIcon } from "@/components/ui/icons/check";
import { HeadsetIcon } from "@/components/ui/icons/headset";
import { MessageSquareChatIcon } from "@/components/ui/icons/message-square-chat";
import { LocalTime } from "@/components/ui/local-time";
import { SegmentedToggle } from "@/components/ui/segmented-toggle";
import { cn } from "@/lib/cn";
import { supportHref } from "@/lib/support";
import {
  isOpenTicket,
  STATUS_COPY,
  type StatusTone,
  type TicketSummary,
} from "@/lib/support-tickets";

type Load =
  | { state: "loading" }
  | { state: "failed" }
  | { state: "ready"; tickets: TicketSummary[] };

const CARD =
  "flex flex-col rounded-surface bg-jumpa-neutral-50 ring-1 ring-jumpa-neutral-60 ring-inset";

type Tab = "open" | "done";

/** The disc says where a conversation stands before any text is read. */
const DISC: Record<StatusTone, { ground: string; Icon: typeof CheckIcon }> = {
  ai: {
    ground: "bg-jumpa-primary-50 text-jumpa-primary-600",
    Icon: MessageSquareChatIcon,
  },
  waiting: {
    ground: "bg-jumpa-warning-50 text-jumpa-warning",
    Icon: HeadsetIcon,
  },
  active: {
    ground: "bg-jumpa-success/10 text-jumpa-success",
    Icon: HeadsetIcon,
  },
  done: {
    ground: "bg-jumpa-neutral-95 text-jumpa-neutral-400",
    Icon: CheckIcon,
  },
};

/** `/support?view=messages`. One list at a time: open or resolved. */
export function SupportMessages() {
  const [load, setLoad] = useState<Load>({ state: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [tab, setTab] = useState<Tab | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: attempt is the retry trigger
  useEffect(() => {
    let cancelled = false;
    setLoad({ state: "loading" });
    fetch("/api/support/tickets", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
      .then((data: { tickets?: TicketSummary[] }) => {
        if (!cancelled)
          setLoad({ state: "ready", tickets: data.tickets ?? [] });
      })
      .catch(() => {
        if (!cancelled) setLoad({ state: "failed" });
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const tickets = load.state === "ready" ? load.tickets : [];
  const open = tickets.filter((t) => isOpenTicket(t.status));
  const done = tickets.filter((t) => !isOpenTicket(t.status));
  // Opens on whichever list has something in it, until the user picks.
  const shown: Tab = tab ?? (open.length || !done.length ? "open" : "done");
  const list = shown === "open" ? open : done;

  return (
    <div className="flex min-h-dvh flex-col px-4.5 pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
      <SupportHeader>
        <h1 className="text-sm leading-4 font-semibold text-jumpa-black">
          Your messages
        </h1>
      </SupportHeader>

      <div className="mt-4 flex flex-1 flex-col gap-4">
        {load.state === "loading" ? (
          <p className="mt-16 text-center text-sm text-jumpa-neutral-500">
            Loading…
          </p>
        ) : load.state === "failed" ? (
          <div className="mt-16 flex flex-col items-center gap-2">
            <p className="text-sm text-jumpa-neutral-700">
              Couldn't load your messages.
            </p>
            <button
              type="button"
              onClick={() => setAttempt((n) => n + 1)}
              className="tap text-sm font-semibold text-jumpa-primary-600"
            >
              Try again
            </button>
          </div>
        ) : tickets.length === 0 ? (
          <div className="mt-16 flex flex-col items-center gap-2 text-center">
            <span className="flex size-14 items-center justify-center rounded-full bg-jumpa-primary-50">
              <MessageSquareChatIcon className="size-7 text-jumpa-primary-600" />
            </span>
            <h2 className="mt-2 text-base leading-6 font-semibold text-jumpa-black">
              No conversations yet
            </h2>
            <p className="max-w-70 text-sm leading-5 text-jumpa-neutral-500">
              When you talk to support, the conversation stays here so you can
              pick it up later.
            </p>
          </div>
        ) : (
          <>
            <SegmentedToggle
              variant="track"
              slide
              value={shown}
              onChange={setTab}
              options={[
                { value: "open", label: tabLabel("Open", open.length) },
                { value: "done", label: tabLabel("Resolved", done.length) },
              ]}
            />
            {list.length ? (
              <ul key={shown} className={cn(CARD, "animate-fade")}>
                {list.map((ticket, i) => (
                  <li key={ticket.id}>
                    {i > 0 ? (
                      <span
                        aria-hidden="true"
                        className="-mb-px ml-16 block h-px bg-jumpa-neutral-95"
                      />
                    ) : null}
                    <TicketRow ticket={ticket} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-10 text-center text-sm leading-5 text-jumpa-neutral-500">
                {shown === "open"
                  ? "Nothing open. Start a conversation if you need a hand."
                  : "Nothing resolved yet."}
              </p>
            )}
          </>
        )}
      </div>

      <div className="mt-8">
        <Button href={supportHref("chat")} variant="gradient" size="lg">
          New conversation
        </Button>
      </div>
    </div>
  );
}

const tabLabel = (label: string, count: number) =>
  count ? `${label} (${count})` : label;

/** Two lines: what it's about and when, then where it stands and the last word. */
function TicketRow({ ticket }: { ticket: TicketSummary }) {
  const { label, tone } = STATUS_COPY[ticket.status];
  const { ground, Icon } = DISC[tone];

  return (
    <Link
      prefetch
      href={supportHref("chat", { ticket: ticket.id })}
      className="tap flex items-center gap-3 px-4 py-3.5 active:scale-[0.99]"
    >
      <span
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-full",
          ground,
        )}
      >
        <Icon className="size-5" />
      </span>

      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex items-center justify-between gap-2">
          <span
            className={cn(
              "truncate text-sm leading-5",
              ticket.unread
                ? "font-bold text-jumpa-black"
                : "font-semibold text-jumpa-neutral-775",
            )}
          >
            {ticket.unread ? (
              <span className="sr-only">New reply. </span>
            ) : null}
            {ticket.subject}
          </span>
          <span className="flex shrink-0 items-center gap-1.5">
            <LocalTime
              at={ticket.updatedAt}
              format="notification"
              className={cn(
                "text-xs leading-4",
                ticket.unread
                  ? "font-semibold text-jumpa-primary-600"
                  : "text-jumpa-neutral-500",
              )}
            />
            {ticket.unread ? (
              <span
                aria-hidden="true"
                className="size-2 rounded-full bg-jumpa-primary-600"
              />
            ) : null}
          </span>
        </span>
        <span className="truncate text-xs leading-4 text-jumpa-neutral-500">
          <span className="font-medium text-jumpa-neutral-700">{label}</span>
          {ticket.preview ? ` · ${ticket.preview}` : null}
        </span>
      </span>
    </Link>
  );
}
