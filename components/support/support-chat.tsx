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

/**
 * TODO(backend): there is no support service yet. Replace `OPENING` and `reply`
 * with the real transcript and the agent's response, and drop `REPLY_MS`.
 */
const OPENING: SupportMessage = {
  id: "opening",
  from: "agent",
  text: "Hi, you're through to Jumpa Support. Tell us what's going on and we'll pick it up from here.",
};

/** Stands in for the time a real agent takes to answer. */
const REPLY_MS = 1400;

/** TODO(backend): the canned acknowledgement, replaced by the agent's reply. */
const ACKNOWLEDGEMENT =
  "Thanks — that's with the team now. Someone will come back to you on this chat shortly.";

/** `/support?view=chat`. */
export function SupportChat() {
  const [messages, setMessages] = useState<SupportMessage[]>([OPENING]);
  const [draft, setDraft] = useState("");
  const [waiting, setWaiting] = useState(false);
  const foot = useRef<HTMLDivElement>(null);

  // Follow the conversation down as it grows, the same as the main transcript.
  // biome-ignore lint/correctness/useExhaustiveDependencies: the lengths are the trigger, the body never reads them
  useEffect(() => {
    foot.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, waiting]);

  useEffect(() => {
    if (!waiting) return;
    const timer = window.setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), from: "agent", text: ACKNOWLEDGEMENT },
      ]);
      setWaiting(false);
    }, REPLY_MS);
    return () => window.clearTimeout(timer);
  }, [waiting]);

  const send = (attachments?: ChatAttachment[]) => {
    const text = draft.trim();
    if (!text && !attachments?.length) return;

    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), from: "user", text, attachments },
    ]);
    setDraft("");
    setWaiting(true);
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

        {/* The indicator carries its own 14px gutter, for the main chat where
            it sits outside the transcript. This screen has its own. */}
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
