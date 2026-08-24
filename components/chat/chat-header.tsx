"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronDownIcon } from "@/components/ui/icons/chevron-down";
import { CloseIcon } from "@/components/ui/icons/close";
import { MessageCircleDotsIcon } from "@/components/ui/icons/message-circle-dots";
import { PlusIcon } from "@/components/ui/icons/plus";
import { TrashAltIcon } from "@/components/ui/icons/trash-alt";

export interface SessionSummary {
  sessionId: string;
  title: string;
  updatedAt: string;
  messageCount: number;
}

function formatRelativeTime(dateStr: string): string {
  try {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  } catch {
    return "";
  }
}

const CONTROL =
  "flex items-center justify-center rounded-pill bg-jumpa-white/70 text-jumpa-grey-600 " +
  "ring-1 ring-jumpa-black/6 shadow-xs backdrop-blur-md tap " +
  "hover:bg-jumpa-white active:scale-95";

/** A faint wash behind the bar, faded out so it leaves no line across the transcript. */
const HEADER_BLUR =
  "before:pointer-events-none before:absolute before:inset-0 before:-z-10 " +
  "before:backdrop-blur-[3px] " +
  "before:[mask-image:linear-gradient(to_bottom,black_45%,transparent)]";

interface ChatHeaderProps {
  onNew: () => void;
  sessions?: SessionSummary[];
  activeSessionId?: string | null;
  onSelectSession?: (sessionId: string) => void;
  onDeleteSession?: (sessionId: string) => void;
}

/** Close, recent-chats panel and new-thread controls, on one 40px line. */
export function ChatHeader({
  onNew,
  sessions = [],
  activeSessionId = null,
  onSelectSession,
  onDeleteSession,
}: ChatHeaderProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      {/* z-50 keeps the toggle and close reachable while the panel is up. */}
      <header
        className={`sticky top-0 z-50 flex items-center justify-between gap-3 px-4 pt-[calc(env(safe-area-inset-top)+13px)] pb-2 ${HEADER_BLUR}`}
      >
        <Link
          href="/home"
          aria-label="Close chat"
          className={`${CONTROL} size-10`}
        >
          <CloseIcon className="size-4.5" />
        </Link>

        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          aria-expanded={open}
          aria-label="Recent chats"
          className={`${CONTROL} h-10 gap-2 px-4 text-sm leading-4 font-medium text-jumpa-primary-950`}
        >
          Recent
          {sessions.length > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-pill bg-jumpa-primary-100 px-1.5 text-xs leading-4 font-semibold text-jumpa-primary-600">
              {sessions.length}
            </span>
          )}
          <ChevronDownIcon
            className={`size-4 text-jumpa-primary-600 transition-transform duration-300 ${
              open ? "rotate-180" : ""
            }`}
          />
        </button>

        <button
          type="button"
          onClick={onNew}
          aria-label="New conversation"
          className="flex size-10 shrink-0 items-center justify-center rounded-pill bg-jumpa-primary-600 text-jumpa-white shadow-sm tap hover:bg-jumpa-primary-500 active:scale-95"
        >
          <PlusIcon className="size-4.5" />
        </button>
      </header>

      {open && (
        <>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 mx-auto max-w-app animate-fade cursor-default bg-jumpa-black/60 backdrop-blur-md"
          />

          <div className="fixed inset-x-3 top-[calc(env(safe-area-inset-top)+66px)] z-45 mx-auto max-w-app animate-drop-in overflow-hidden rounded-3xl bg-jumpa-white/95 shadow-2xl ring-1 ring-jumpa-black/6 backdrop-blur-xl">
            <div className="flex items-center justify-between gap-3 px-5 pt-4.5 pb-3">
              <h2 className="text-base leading-5 font-semibold text-jumpa-black">
                Recent chats
              </h2>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onNew();
                }}
                className="flex h-8 items-center gap-1.5 rounded-pill bg-jumpa-primary-50 px-3 text-xs leading-4 font-semibold text-jumpa-primary-600 tap hover:bg-jumpa-primary-100 active:scale-95"
              >
                <PlusIcon className="size-3.5" />
                New chat
              </button>
            </div>

            {sessions.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-5 pt-2 pb-9 text-center">
                <span className="flex size-12 items-center justify-center rounded-pill bg-jumpa-neutral-95 text-jumpa-neutral-350">
                  <MessageCircleDotsIcon className="size-6" />
                </span>
                <p className="text-sm leading-4.5 font-medium text-jumpa-black">
                  No chats yet
                </p>
                <p className="text-xs leading-4 text-jumpa-neutral-350">
                  Ask Jumpa to send, swap or save something.
                </p>
              </div>
            ) : (
              <div className="max-h-[min(38dvh,260px)] overflow-y-auto px-2.5 pb-3 [scrollbar-width:none]">
                {sessions.slice(0, 10).map((session, index) => {
                  const isActive = session.sessionId === activeSessionId;
                  return (
                    <div
                      key={session.sessionId}
                      style={{ "--i": index } as React.CSSProperties}
                      className={`flex animate-rise stagger items-center gap-1 rounded-xl pr-1.5 pl-3 tap ${
                        isActive
                          ? "bg-jumpa-primary-50"
                          : "hover:bg-jumpa-neutral-95"
                      }`}
                    >
                      {/* Holds its space when inactive so the row never shifts. */}
                      <span
                        aria-hidden="true"
                        className={`h-6 w-0.5 shrink-0 rounded-pill ${
                          isActive ? "bg-jumpa-primary-600" : "bg-transparent"
                        }`}
                      />

                      <button
                        type="button"
                        onClick={() => {
                          setOpen(false);
                          onSelectSession?.(session.sessionId);
                        }}
                        className="flex min-w-0 flex-1 items-center gap-2 py-2 pl-2.5 text-left"
                      >
                        <span
                          className={`min-w-0 flex-1 truncate text-sm leading-4.5 ${
                            isActive
                              ? "font-semibold text-jumpa-primary-950"
                              : "font-medium text-jumpa-black"
                          }`}
                        >
                          {session.title}
                        </span>
                        <span className="shrink-0 text-xs leading-4 text-jumpa-neutral-350">
                          {formatRelativeTime(session.updatedAt)}
                        </span>
                      </button>

                      {/* Always visible — hover-only is unreachable on touch. */}
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          onDeleteSession?.(session.sessionId);
                        }}
                        aria-label={`Delete chat: ${session.title}`}
                        className="flex size-8 shrink-0 items-center justify-center rounded-pill text-jumpa-neutral-350 tap hover:bg-jumpa-danger/10 hover:text-jumpa-danger active:scale-90"
                      >
                        <TrashAltIcon className="size-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}
