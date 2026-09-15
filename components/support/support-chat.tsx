"use client";

import { useEffect, useRef, useState } from "react";
import { AgentAvatar } from "@/components/chat/agent-avatar";
import { AttachmentList } from "@/components/chat/attachment-list";
import { ChatComposer } from "@/components/chat/chat-composer";
import { MessageBubble } from "@/components/chat/message-bubble";
import { TypingIndicator } from "@/components/chat/typing-indicator";
import { SupportHeader } from "@/components/support/support-header";
import type { ChatAttachment } from "@/lib/chat-attachments";

interface SupportMessage {
  id: string;
  from: "user" | "agent";
  text: string;
  attachments?: ChatAttachment[];
}

const OPENING: SupportMessage = {
  id: "opening",
  from: "agent",
  text: "Hi, you're through to Jumpa Support. Tell us what's going on and we'll pick it up from here.",
};

/** `/support?view=chat`. */
export function SupportChat() {
  const [messages, setMessages] = useState<SupportMessage[]>([OPENING]);
  const [draft, setDraft] = useState("");
  const [waiting, setWaiting] = useState(false);
  const foot = useRef<HTMLDivElement>(null);

  // Load persistent support history from the database on mount
  useEffect(() => {
    let cancelled = false;

    async function loadHistory() {
      try {
        const res = await fetch("/api/support-agent");
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && data.messages && data.messages.length > 0) {
          setMessages(
            data.messages.map((m: any) => ({
              id: m.id,
              from: m.role === "assistant" ? "agent" : "user",
              text: m.content,
              attachments: m.attachments,
            })),
          );
        }
      } catch (err) {
        console.warn("[SupportChat] Failed to load previous transcript:", err);
      }
    }

    loadHistory();
    return () => {
      cancelled = true;
    };
  }, []);

  // Follow the conversation down as it grows
  // biome-ignore lint/correctness/useExhaustiveDependencies: the lengths are the trigger
  useEffect(() => {
    foot.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, waiting]);

  const send = async (attachments?: ChatAttachment[]) => {
    const text = draft.trim();
    if (!text && !attachments?.length) return;

    const messageText =
      text ||
      (attachments?.length
        ? `I have attached ${attachments.map((a) => a.name).join(", ")}`
        : "");

    const userMsgId = crypto.randomUUID();

    setMessages((prev) => [
      ...prev,
      { id: userMsgId, from: "user", text: messageText, attachments },
    ]);
    setDraft("");
    setWaiting(true);

    try {
      const res = await fetch("/api/support-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: messageText,
          attachments: attachments || [],
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data.reply) {
        setMessages((prev) => [
          ...prev,
          {
            id: data.assistantMessageId || crypto.randomUUID(),
            from: "agent",
            text: data.reply,
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            from: "agent",
            text:
              data?.error ||
              "I'm having trouble connecting to our support network right now. Please try again or email us at support@usejumpa.com.",
          },
        ]);
      }
    } catch (err) {
      console.error("[SupportChat Send Error]", err);
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          from: "agent",
          text: "A connection error occurred. Please check your network and try again, or write to support@usejumpa.com.",
        },
      ]);
    } finally {
      setWaiting(false);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col px-4.5 pt-[calc(env(safe-area-inset-top)+21px)] pb-[calc(env(safe-area-inset-bottom)+1rem)]">
      <SupportHeader>
        <span className="flex items-center gap-2">
          <AgentAvatar />
          <h1 className="text-[13px] leading-4 font-medium text-jumpa-black">
            Jumpa Support
          </h1>
        </span>
      </SupportHeader>

      <div className="mt-8 flex flex-1 flex-col gap-5">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex items-start gap-1 ${
              message.from === "user" ? "justify-end" : ""
            }`}
          >
            {message.from === "agent" ? <AgentAvatar /> : null}

            <div
              className={`flex max-w-[70%] flex-col gap-2 ${
                message.from === "user" ? "items-end" : "items-start"
              }`}
            >
              {message.text ? (
                <MessageBubble from={message.from}>
                  {message.text}
                </MessageBubble>
              ) : null}

              {message.attachments?.length ? (
                <AttachmentList
                  items={message.attachments}
                  align={message.from}
                />
              ) : null}
            </div>
          </div>
        ))}

        {/* The indicator carries its own 14px gutter */}
        {waiting ? (
          <div className="-mx-3.5">
            <TypingIndicator />
          </div>
        ) : null}
        <div ref={foot} />
      </div>

      <div className="sticky bottom-0 mt-6 bg-jumpa-white pt-2">
        <ChatComposer
          value={draft}
          onChange={setDraft}
          onSend={send}
          tone="plain"
          autoFocus={false}
          placeholder="Tell us what you need help with..."
        />
      </div>
    </div>
  );
}
