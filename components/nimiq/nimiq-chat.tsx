"use client";

import { useEffect, useRef, useState } from "react";
import { ChatBackdrop } from "@/components/chat/chat-backdrop";
import { ChatComposer } from "@/components/chat/chat-composer";
import { ChatDock } from "@/components/chat/chat-dock";
import { ChatErrorBoundary } from "@/components/chat/chat-error-boundary";
import { ChatHeader } from "@/components/chat/chat-header";
import { ChatIntro } from "@/components/chat/chat-intro";
import { ChatTopFade } from "@/components/chat/chat-top-fade";
import {
  type Suggestion,
  SuggestionCard,
} from "@/components/chat/suggestion-card";
import { Transcript } from "@/components/chat/transcript";
import { TypingIndicator } from "@/components/chat/typing-indicator";
import { ArrowTrendUpIcon } from "@/components/ui/icons/arrow-trend-up";
import { MoneyBillIcon } from "@/components/ui/icons/money-bill";
import { MoneyWithdrawalIcon } from "@/components/ui/icons/money-withdrawal";
import { PhoneIcon } from "@/components/ui/icons/phone";
import { WalletPlusIcon } from "@/components/ui/icons/wallet-plus";
import type { ChatEntry, ChatItem } from "@/lib/chat";
import { nimiqApi } from "@/lib/nimiq/api-client";
import { type ChatHandoff, HANDOFF_LABEL } from "@/lib/nimiq/chat-handoff";

type ChatLine = {
  id: string;
  role: "user" | "assistant";
  content: string;
  /** The screen this reply offers to open. */
  handoff?: ChatHandoff;
  /** A reply that never came; shown, but not sent back as context. */
  failed?: boolean;
};

/** Lines kept on the device. */
const KEPT_LINES = 40;
/** Lines sent with each question; the route accepts up to 12. */
const SENT_LINES = 12;
/** The route's limit per message. */
const MAX_CHARS = 1000;

const INTRO = "Ask me to cash out, top up, or buy airtime and data.";

const SUGGESTIONS: Suggestion[] = [
  { label: "Check Balance", Icon: MoneyBillIcon, prompt: "What's my balance?" },
  {
    label: "Cash out",
    Icon: MoneyWithdrawalIcon,
    prompt: "I want to cash out to my bank",
  },
  {
    label: "Top up",
    Icon: WalletPlusIcon,
    prompt: "I want to top up USDT with Naira",
  },
  { label: "Buy airtime", Icon: PhoneIcon, prompt: "I want to buy airtime" },
  {
    label: "Today's rates",
    Icon: ArrowTrendUpIcon,
    prompt: "What are today's rates?",
  },
];

const storageKey = (address: string) =>
  `jumpa.nimiq.chat.${address.toLowerCase()}`;

function load(address: string): ChatLine[] {
  try {
    const stored = JSON.parse(
      localStorage.getItem(storageKey(address)) ?? "[]",
    );
    return Array.isArray(stored)
      ? stored.filter(
          (line): line is ChatLine =>
            typeof line?.id === "string" &&
            (line.role === "user" || line.role === "assistant") &&
            typeof line.content === "string",
        )
      : [];
  } catch {
    return [];
  }
}

function save(address: string, lines: ChatLine[]) {
  try {
    localStorage.setItem(
      storageKey(address),
      JSON.stringify(lines.slice(-KEPT_LINES)),
    );
  } catch {
    // Private mode or a full store: the chat still works, it just isn't kept.
  }
}

let lineCount = 0;
const newId = () => `line_${Date.now()}_${++lineCount}`;

/** Consecutive lines from one side share a group; only the newest reply keeps its button. */
function toEntries(lines: ChatLine[], revealId?: string): ChatEntry[] {
  const latest = lines.at(-1);
  const entries: ChatEntry[] = [];
  for (const line of lines) {
    const role = line.role === "assistant" ? "agent" : "user";
    const items: ChatItem[] = [
      {
        kind: "text",
        text: line.content,
        paragraph: line.content.length > 50 || line.content.includes("\n"),
        reveal: line.id === revealId,
      },
    ];
    if (line.handoff && line === latest) {
      items.push({
        kind: "actions",
        confirmLabel: HANDOFF_LABEL[line.handoff.flow],
        cancelLabel: false,
      });
    }
    const last = entries.at(-1);
    if (last?.kind === "group" && last.role === role) last.items.push(...items);
    else entries.push({ id: line.id, kind: "group", role, items });
  }
  return entries;
}

/** The main app's chat for a Nimiq Pay wallet: answers, and opens the screen that does the rest. */
export function NimiqChat({
  address,
  onClose,
  onHandoff,
}: {
  address: string;
  onClose: () => void;
  onHandoff: (handoff: ChatHandoff) => void;
}) {
  // Client-only: the mini app renders after the wallet is detected.
  const [lines, setLines] = useState(() => load(address));
  const [input, setInput] = useState("");
  const [responding, setResponding] = useState(false);
  const [revealId, setRevealId] = useState<string>();
  const end = useRef<HTMLDivElement>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: a new line or the typing dots are the trigger
  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines.length, responding]);

  const update = (next: ChatLine[]) => {
    setLines(next);
    save(address, next);
  };

  const send = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || responding) return;
    const asked: ChatLine[] = [
      ...lines,
      { id: newId(), role: "user", content },
    ];
    update(asked);
    setInput("");
    setResponding(true);
    let reply: ChatLine;
    try {
      const turns = asked
        .filter((line) => !line.failed)
        .slice(-SENT_LINES)
        .map(({ role, content: said }) => ({
          role,
          content: said.slice(0, MAX_CHARS),
        }));
      const answer = await nimiqApi.chat(address, turns);
      reply = {
        id: newId(),
        role: "assistant",
        content: answer.reply,
        ...(answer.handoff ? { handoff: answer.handoff } : {}),
      };
    } catch (error) {
      reply = {
        id: newId(),
        role: "assistant",
        content: (error as Error).message,
        failed: true,
      };
    }
    update([...asked, reply]);
    setRevealId(reply.id);
    setResponding(false);
  };

  const latest = lines.at(-1);
  const started = lines.length > 0;

  return (
    <div className="relative isolate flex min-h-dvh flex-col pb-4">
      <ChatBackdrop soft={started} />

      <ChatHeader
        onClose={onClose}
        recent={false}
        onNew={() => {
          update([]);
          setInput("");
        }}
      />

      {started ? (
        <>
          <ChatTopFade />
          <div className="flex-1 pt-8 pb-2">
            <ChatErrorBoundary fallbackTitle="Chat could not be displayed">
              <Transcript
                entries={toEntries(lines, revealId)}
                onConfirm={() => {
                  if (latest?.handoff) onHandoff(latest.handoff);
                }}
                onCancel={() => {}}
                onReply={(reply) => void send(reply)}
              />
            </ChatErrorBoundary>

            {responding ? (
              <div className="mt-5">
                <TypingIndicator />
              </div>
            ) : null}

            <div ref={end} />
          </div>
        </>
      ) : (
        <ChatIntro title={INTRO} />
      )}

      <ChatDock>
        {started ? null : (
          <SuggestionCard
            suggestions={SUGGESTIONS}
            onSelect={(prompt) => void send(prompt)}
          />
        )}
        <ChatComposer
          value={input}
          onChange={setInput}
          onSend={(_, typed) => void send(typed)}
          disabled={responding}
          media={false}
        />
      </ChatDock>
    </div>
  );
}
