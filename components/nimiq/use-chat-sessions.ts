"use client";

import { useEffect, useState } from "react";
import type { SessionSummary } from "@/components/chat/chat-header";
import type { ChatCard } from "@/lib/nimiq/chat-cards";

export type ChatLine = {
  id: string;
  role: "user" | "assistant";
  content: string;
  /** What the reply carries under its text. */
  card?: ChatCard;
  /** The row picked from this line's plans or choices. */
  answer?: string;
  /** The order this line's confirm card placed. */
  orderId?: string;
  /** The user turned this line's confirm card down. */
  declined?: boolean;
  /** A reply that never came; shown, but not sent back as context. */
  failed?: boolean;
};

export type ChatSession = {
  id: string;
  title: string;
  updatedAt: string;
  lines: ChatLine[];
};

/** Conversations kept on the device, and lines kept per conversation. */
const KEPT_SESSIONS = 20;
const KEPT_LINES = 40;
const TITLE_CHARS = 40;

const storageKey = (address: string) =>
  `jumpa.nimiq.chats.${address.toLowerCase()}`;
/** The single conversation kept before there were several. */
const legacyKey = (address: string) =>
  `jumpa.nimiq.chat.${address.toLowerCase()}`;

let idCount = 0;
export const newChatId = (prefix: string) =>
  `${prefix}_${Date.now()}_${++idCount}`;

const isLine = (line: unknown): line is ChatLine => {
  const candidate = line as ChatLine | null;
  return (
    typeof candidate?.id === "string" &&
    (candidate.role === "user" || candidate.role === "assistant") &&
    typeof candidate.content === "string"
  );
};

function titleOf(lines: ChatLine[]) {
  const first = lines.find((line) => line.role === "user")?.content ?? "";
  return first.length > TITLE_CHARS
    ? `${first.slice(0, TITLE_CHARS - 1)}…`
    : first || "New chat";
}

function read(key: string): unknown {
  try {
    return JSON.parse(localStorage.getItem(key) ?? "null");
  } catch {
    return null;
  }
}

function load(address: string): ChatSession[] {
  const stored = read(storageKey(address));
  if (Array.isArray(stored)) {
    return stored.flatMap((session: Partial<ChatSession>) =>
      typeof session?.id === "string" && Array.isArray(session.lines)
        ? [
            {
              id: session.id,
              title: String(session.title ?? ""),
              updatedAt: String(session.updatedAt ?? ""),
              lines: session.lines.filter(isLine),
            },
          ]
        : [],
    );
  }
  const legacy = read(legacyKey(address));
  const lines = Array.isArray(legacy) ? legacy.filter(isLine) : [];
  return lines.length
    ? [
        {
          id: newChatId("chat"),
          title: titleOf(lines),
          updatedAt: new Date().toISOString(),
          lines,
        },
      ]
    : [];
}

function save(address: string, sessions: ChatSession[]) {
  try {
    localStorage.setItem(storageKey(address), JSON.stringify(sessions));
    localStorage.removeItem(legacyKey(address));
  } catch {
    // Private mode or a full store: the chat still works, it just isn't kept.
  }
}

/** The wallet's conversations on this device; the newest opens first. */
export function useChatSessions(address: string) {
  // Client-only: the mini app renders after the wallet is detected.
  const [state, setState] = useState(() => {
    const sessions = load(address);
    return { sessions, activeId: sessions[0]?.id ?? newChatId("chat") };
  });
  const { sessions, activeId } = state;

  useEffect(() => save(address, sessions), [address, sessions]);

  /** Rewrites one conversation's lines; a new line moves it to the top. */
  const edit = (id: string, change: (lines: ChatLine[]) => ChatLine[]) =>
    setState((current) => {
      const existing = current.sessions.find((session) => session.id === id);
      const lines = change(existing?.lines ?? []).slice(-KEPT_LINES);
      const grew = !existing || lines.length !== existing.lines.length;
      const session: ChatSession = {
        id,
        title: existing?.title || titleOf(lines),
        updatedAt: grew
          ? new Date().toISOString()
          : (existing?.updatedAt ?? new Date().toISOString()),
        lines,
      };
      const others = current.sessions.filter((item) => item.id !== id);
      return {
        ...current,
        sessions: grew
          ? [session, ...others].slice(0, KEPT_SESSIONS)
          : current.sessions.map((item) => (item.id === id ? session : item)),
      };
    });

  const summaries: SessionSummary[] = sessions
    .filter((session) => session.lines.length > 0)
    .map((session) => ({
      sessionId: session.id,
      title: session.title,
      updatedAt: session.updatedAt,
      messageCount: session.lines.length,
    }));

  return {
    activeId,
    lines: sessions.find((session) => session.id === activeId)?.lines ?? [],
    summaries,
    edit,
    select: (id: string) =>
      setState((current) => ({ ...current, activeId: id })),
    startNew: () =>
      setState((current) => ({ ...current, activeId: newChatId("chat") })),
    remove: (id: string) =>
      setState((current) => ({
        sessions: current.sessions.filter((session) => session.id !== id),
        activeId:
          current.activeId === id ? newChatId("chat") : current.activeId,
      })),
  };
}
