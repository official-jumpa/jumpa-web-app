"use client";

import Link from "next/link";
import { useState } from "react";
import { CloseIcon } from "@/components/ui/icons/close";
import { TriangleDownIcon } from "@/components/ui/icons/triangle-down";

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

interface ChatHeaderProps {
  onNew: () => void;
  sessions?: SessionSummary[];
  activeSessionId?: string | null;
  onSelectSession?: (sessionId: string) => void;
  onDeleteSession?: (sessionId: string) => void;
}

/** Close / Full-Width Compact Recent Chats dropdown with delete actions / new-thread controls. */
export function ChatHeader({
  onNew,
  sessions = [],
  activeSessionId = null,
  onSelectSession,
  onDeleteSession,
}: ChatHeaderProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-30 flex items-center justify-between pt-[calc(env(safe-area-inset-top)+13px)] pr-4.5 pl-4">
        <Link
          href="/home"
          aria-label="Close chat"
          className="flex size-9.5 items-center justify-center rounded-pill border border-jumpa-neutral-50 bg-jumpa-grey-300 text-jumpa-white tap hover:opacity-90 active:scale-95"
        >
          <CloseIcon className="size-5" />
        </Link>

        <button
          type="button"
          onClick={() => setDropdownOpen((prev) => !prev)}
          aria-expanded={dropdownOpen}
          aria-label="View recent chats"
          className="flex h-7 items-center gap-2 rounded-pill bg-jumpa-secondary-100 px-3 text-xs leading-5 font-medium text-jumpa-primary-950 transition-colors hover:bg-jumpa-secondary-200 cursor-pointer"
        >
          Recent
          <TriangleDownIcon
            className={`size-3 text-jumpa-primary-600 transition-transform duration-200 ${
              dropdownOpen ? "rotate-180" : ""
            }`}
          />
        </button>

        <button
          type="button"
          onClick={onNew}
          aria-label="New conversation"
          className="flex size-9.5 items-center justify-center rounded-pill border border-jumpa-primary-600 bg-jumpa-primary-100 text-xs font-semibold text-jumpa-primary-600 transition-transform hover:scale-105 active:scale-95 cursor-pointer"
        >
          +
        </button>
      </header>

      {/* Full-Width Compact Recent Sessions Popover */}
      {dropdownOpen && (
        <>
          {/* Subtle click-outside backdrop */}
          <div
            className="fixed inset-0 z-40 bg-jumpa-black/20 backdrop-blur-2xs"
            onClick={() => setDropdownOpen(false)}
          />

          <div className="fixed top-[calc(env(safe-area-inset-top)+54px)] inset-x-3.5 mx-auto max-w-[400px] z-50 max-h-64 overflow-y-auto rounded-2xl border border-jumpa-neutral-100 bg-jumpa-white p-2.5 shadow-2xl animate-drop-in">
            <div className="px-2 pb-1.5 border-b border-jumpa-neutral-100 flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-jumpa-grey-600">
                Recent Chats ({sessions.length})
              </span>
              <button
                type="button"
                onClick={() => {
                  setDropdownOpen(false);
                  onNew();
                }}
                className="text-[11px] font-semibold text-jumpa-primary-600 hover:text-jumpa-primary-700 cursor-pointer"
              >
                + New Chat
              </button>
            </div>

            <div className="flex flex-col gap-0.5 pt-1.5">
              {sessions.length === 0 ? (
                <div className="py-4 text-center text-xs text-jumpa-grey-600">
                  No chat history yet.
                </div>
              ) : (
                sessions.slice(0, 10).map((s) => {
                  const isActive = s.sessionId === activeSessionId;
                  return (
                    <div
                      key={s.sessionId}
                      className={`group flex items-center justify-between w-full rounded-xl px-3 py-1.75 text-left transition-colors ${
                        isActive
                          ? "bg-jumpa-primary-50 text-jumpa-primary-950 font-medium"
                          : "text-jumpa-black hover:bg-jumpa-neutral-95"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setDropdownOpen(false);
                          onSelectSession?.(s.sessionId);
                        }}
                        className="flex items-center justify-between flex-1 min-w-0 pr-2 cursor-pointer text-left"
                      >
                        <span className="truncate text-xs leading-4 flex-1 font-medium">
                          {s.title}
                        </span>
                        <span className="text-[10px] text-jumpa-grey-600 shrink-0 ml-2">
                          {formatRelativeTime(s.updatedAt)}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteSession?.(s.sessionId);
                        }}
                        aria-label="Delete chat"
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-jumpa-grey-500 hover:text-jumpa-danger rounded-md hover:bg-jumpa-neutral-200 cursor-pointer"
                      >
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
