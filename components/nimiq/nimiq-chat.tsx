"use client";

import { useEffect, useRef, useState } from "react";
import type { Address } from "viem";
import { ChatBackdrop } from "@/components/chat/chat-backdrop";
import { ChatComposer } from "@/components/chat/chat-composer";
import { ChatDock } from "@/components/chat/chat-dock";
import { ChatErrorBoundary } from "@/components/chat/chat-error-boundary";
import { ChatHeader } from "@/components/chat/chat-header";
import { ChatIntro } from "@/components/chat/chat-intro";
import { ChatTopFade } from "@/components/chat/chat-top-fade";
import { OptionsCard } from "@/components/chat/options-card";
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
import { type ChatAttachment, isAudioAttachment } from "@/lib/chat-attachments";
import { nimiqApi } from "@/lib/nimiq/api-client";
import { type ChatCard, usdtFor } from "@/lib/nimiq/chat-cards";
import type { PublicOrder } from "@/lib/nimiq/order-status";
import type { Eip1193 } from "@/lib/nimiq/provider";
import { ChatOrderCard, ChatPaymentCard } from "./chat-payment-card";
import { OrderHistoryList } from "./order-history-list";
import { type ChatLine, newChatId, useChatSessions } from "./use-chat-sessions";
import { primeOrder } from "./use-nimiq-order";

/** Lines sent with each question; the route accepts up to 12. */
const SENT_LINES = 12;
/** The route's limit per message. */
const MAX_CHARS = 1000;
/** Orders the history card lists. */
const HISTORY_ROWS = 5;
/** The mini app's own upload route; the main app's needs a Jumpa login. */
const NIMIQ_UPLOADS = "/api/v1/nimiq/chat/attachments";

const INTRO = "Cash out, top up, or buy airtime and data, right here.";

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

/** Consecutive lines from one side share a group; a card sits under its line's text. */
function toEntries(lines: ChatLine[], revealId?: string): ChatEntry[] {
  const entries: ChatEntry[] = [];
  for (const line of lines) {
    const role = line.role === "assistant" ? "agent" : "user";
    const voice = line.attachments?.some((file) =>
      isAudioAttachment(file.mime, file.name),
    );
    const items: ChatItem[] = [
      // Files sit above the text; a voice note carries its transcript itself.
      ...(line.attachments?.length
        ? [
            {
              kind: "attachments" as const,
              items: line.attachments,
              transcript: voice ? line.content : undefined,
            },
          ]
        : []),
      ...(line.content && !voice
        ? [
            {
              kind: "text" as const,
              text: line.content,
              paragraph:
                line.content.length > 50 || line.content.includes("\n"),
              reveal: line.id === revealId,
            },
          ]
        : []),
      ...(line.card ? [{ kind: "slot" as const, id: line.id }] : []),
    ];
    const last = entries.at(-1);
    if (last?.kind === "group" && last.role === role) last.items.push(...items);
    else entries.push({ id: line.id, kind: "group", role, items });
  }
  return entries;
}

/** The main app's chat for a Nimiq Pay wallet: it answers, and pays, without leaving the chat. */
export function NimiqChat({
  address,
  provider,
  orders,
  historyError,
  onRetryHistory,
  onOpenOrder,
  onClose,
  onOrderCreated,
  onPlaced,
  onUpdate,
}: {
  address: Address;
  provider: Eip1193;
  /** The device's orders, newest first, for the history card. */
  orders?: PublicOrder[];
  historyError?: string;
  onRetryHistory: () => void;
  onOpenOrder: (orderId: string) => void;
  onClose: () => void;
  onOrderCreated: (orderId: string) => void;
  /** A payment from the chat went through to the server. */
  onPlaced: (order: PublicOrder) => void;
  /** Every state a chat payment is seen in. Must be stable. */
  onUpdate: (order: PublicOrder) => void;
}) {
  const chats = useChatSessions(address);
  const { activeId, lines } = chats;
  const [input, setInput] = useState("");
  /** The conversation waiting on a reply, if any. */
  const [waitingOn, setWaitingOn] = useState<string | null>(null);
  const [revealId, setRevealId] = useState<string>();
  const end = useRef<HTMLDivElement>(null);
  const responding = waitingOn !== null;

  // biome-ignore lint/correctness/useExhaustiveDependencies: a new line, the typing dots or another chat are the trigger
  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines.length, waitingOn, activeId]);

  const ask = async (sessionId: string, history: ChatLine[]) => {
    setWaitingOn(sessionId);
    let reply: ChatLine;
    try {
      const turns = history
        .filter((line) => !line.failed)
        .slice(-SENT_LINES)
        .map(({ role, content, attachments }) => ({
          role,
          content: content.slice(0, MAX_CHARS),
          ...(attachments?.length ? { attachments } : {}),
        }));
      const answer = await nimiqApi.chat(address, turns);
      // A top-up arrives already opened: remember it like one placed from a card.
      if (answer.card?.type === "order") {
        primeOrder(answer.card.order);
        onOrderCreated(answer.card.order.id);
        onPlaced(answer.card.order);
      }
      reply = {
        id: newChatId("line"),
        role: "assistant",
        content: answer.reply,
        ...(answer.card ? { card: answer.card } : {}),
      };
    } catch (error) {
      reply = {
        id: newChatId("line"),
        role: "assistant",
        content: (error as Error).message,
        failed: true,
      };
    }
    chats.edit(sessionId, (current) => [...current, reply]);
    setRevealId(reply.id);
    setWaitingOn(null);
  };

  const send = (text?: string, attachments?: ChatAttachment[]) => {
    const content = (text ?? input).trim();
    if ((!content && !attachments?.length) || responding) return;
    const asked: ChatLine[] = [
      ...lines,
      {
        id: newChatId("line"),
        role: "user",
        content,
        ...(attachments?.length ? { attachments } : {}),
      },
    ];
    chats.edit(activeId, () => asked);
    setInput("");
    void ask(activeId, asked);
  };

  /** Changes one line of the open conversation. */
  const patch = (lineId: string, change: Partial<ChatLine>) => {
    const sessionId = activeId;
    chats.edit(sessionId, (current) =>
      current.map((line) =>
        line.id === lineId ? { ...line, ...change } : line,
      ),
    );
  };

  const pickChoice = (line: ChatLine, reply: string) => {
    if (line.answer || responding) return;
    patch(line.id, { answer: reply });
    send(reply);
  };

  /** A picked plan becomes a card to confirm straight away, with no round trip. */
  const pickPlan = (
    line: ChatLine,
    card: Extract<ChatCard, { type: "plans" }>,
    productName: string,
  ) => {
    const plan = card.plans.find((item) => item.productName === productName);
    if (line.answer || responding || !plan) return;
    const reply: ChatLine = {
      id: newChatId("line"),
      role: "assistant",
      content:
        "Here's your data plan. Check it, tap Confirm and approve in Nimiq Pay.",
      card: {
        type: "confirm",
        proposal: {
          kind: "data",
          phone: card.phone,
          network: card.network,
          productName,
          plan: `${plan.size} · ${plan.validity}`,
          amountNgn: plan.amountNgn,
          usdt: usdtFor(plan.amountNgn, card.perUsdt),
        },
      },
    };
    chats.edit(activeId, (current) => [
      ...current.map((item) =>
        item.id === line.id ? { ...item, answer: productName } : item,
      ),
      {
        id: newChatId("line"),
        role: "user",
        content: `${plan.size} (${plan.validity}) for ${plan.price}`,
      },
      reply,
    ]);
    setRevealId(reply.id);
  };

  const renderCard = (lineId: string) => {
    const line = lines.find((item) => item.id === lineId);
    const card = line?.card;
    if (!line || !card) return null;
    switch (card.type) {
      case "confirm":
        return (
          <ChatPaymentCard
            proposal={card.proposal}
            orderId={line.orderId}
            declined={line.declined}
            provider={provider}
            address={address}
            onOrderCreated={onOrderCreated}
            onPlaced={(order) => {
              patch(line.id, { orderId: order.id });
              onPlaced(order);
            }}
            onDecline={() => patch(line.id, { declined: true })}
            onUpdate={onUpdate}
            topUpStep={line.topUpStep}
            onTopUpStep={(topUpStep) => patch(line.id, { topUpStep })}
          />
        );
      case "plans":
        return (
          <OptionsCard
            card={{
              options: card.plans.map((plan) => ({
                label: plan.size,
                description: plan.validity,
                amount: plan.price,
                reply: plan.productName,
              })),
            }}
            answer={line.answer}
            onReply={(productName) => pickPlan(line, card, productName)}
          />
        );
      case "choices":
        return (
          <OptionsCard
            card={{ options: card.options }}
            answer={line.answer}
            onReply={(reply) => pickChoice(line, reply)}
          />
        );
      case "order":
        return (
          <ChatOrderCard
            orderId={card.order.id}
            onUpdate={onUpdate}
            topUpStep={line.topUpStep}
            onTopUpStep={(topUpStep) => patch(line.id, { topUpStep })}
          />
        );
      case "history":
        return (
          <OrderHistoryList
            orders={orders?.slice(0, HISTORY_ROWS)}
            error={historyError}
            onRetry={onRetryHistory}
            onOpen={onOpenOrder}
          />
        );
    }
  };

  const started = lines.length > 0;

  return (
    <div className="relative isolate flex min-h-dvh flex-col pb-4">
      <ChatBackdrop soft={started} />

      <ChatHeader
        onClose={onClose}
        sessions={chats.summaries}
        activeSessionId={activeId}
        onSelectSession={chats.select}
        onDeleteSession={chats.remove}
        onNew={() => {
          chats.startNew();
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
                onConfirm={() => {}}
                onCancel={() => {}}
                onReply={(reply) => send(reply)}
                renderSlot={renderCard}
              />
            </ChatErrorBoundary>

            {waitingOn === activeId ? (
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
            onSelect={(prompt) => send(prompt)}
          />
        )}
        <ChatComposer
          value={input}
          onChange={setInput}
          onSend={(attachments, typed) => send(typed, attachments)}
          disabled={responding}
          uploadUrl={NIMIQ_UPLOADS}
          deletable={false}
        />
      </ChatDock>
    </div>
  );
}
