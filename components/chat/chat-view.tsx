"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChatBackdrop } from "@/components/chat/chat-backdrop";
import { ChatDock } from "@/components/chat/chat-dock";
import { ChatComposer } from "@/components/chat/chat-composer";
import { ChatHeader, type SessionSummary } from "@/components/chat/chat-header";
import { ChatIntro } from "@/components/chat/chat-intro";
import { ChatTopFade } from "@/components/chat/chat-top-fade";
import { PinSheet } from "@/components/chat/pin-sheet";
import { SuggestionCard } from "@/components/chat/suggestion-card";
import { Transcript } from "@/components/chat/transcript";
import type { ChatEntry, ChatItem, QuoteCard as Quote } from "@/lib/chat";
import type { IChatMessage } from "@/models/ChatLog";

/**
 * Transforms database chat messages into visually grouped ChatEntry objects
 * supporting text, quote cards, transfer cards, onramp, offramp, and receipt cards.
 */
function messagesToChatEntries(messages: IChatMessage[]): ChatEntry[] {
  const entries: ChatEntry[] = [];
  let currentGroup: {
    id: string;
    kind: "group";
    role: "user" | "agent";
    items: ChatItem[];
  } | null = null;

  for (const msg of messages) {
    const role: "user" | "agent" = msg.role === "assistant" ? "agent" : "user";

    const items: ChatItem[] = [];

    // Text message
    if (msg.content) {
      items.push({
        kind: "text",
        text: msg.content,
        paragraph:
          msg.content.length > 50 ||
          msg.content.includes("\n") ||
          msg.content.includes("**"),
      });
    }

    // Interactive Card rendering
    if (msg.cardType === "quote" && msg.cardData) {
      const isPending = msg.status === "pending";
      items.push({
        kind: "quote",
        card: msg.cardData as any,
        isEditable: isPending,
      });

      if (isPending) {
        items.push({
          kind: "text",
          text: "Ready to proceed? I'll need your PIN to confirm the swap.",
          paragraph: true,
        });
        items.push({ kind: "actions" });
      }
    } else if (msg.cardType === "transfer" && msg.cardData) {
      const isPending = msg.status === "pending";
      items.push({
        kind: "transfer",
        card: msg.cardData as any,
      });

      if (isPending) {
        items.push({
          kind: "text",
          text: "Ready to proceed? I'll need your PIN to confirm the transfer.",
          paragraph: true,
        });
        items.push({ kind: "actions" });
      }
    } else if (msg.cardType === "onramp" && msg.cardData) {
      items.push({
        kind: "onramp",
        card: msg.cardData as any,
      });
    } else if (msg.cardType === "offramp" && msg.cardData) {
      items.push({
        kind: "offramp",
        card: msg.cardData as any,
      });
    } else if (msg.cardType === "receipt" && msg.cardData) {
      items.push({
        kind: "receipt",
        card: msg.cardData as any,
      });
    }

    if (currentGroup && currentGroup.role === role) {
      currentGroup.items.push(...items);
    } else {
      if (currentGroup) {
        entries.push(currentGroup);
      }
      currentGroup = {
        id: msg.id || `grp-${Date.now()}-${Math.random()}`,
        kind: "group",
        role,
        items,
      };
    }
  }

  if (currentGroup) {
    entries.push(currentGroup);
  }

  return entries;
}

export function ChatView() {
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<IChatMessage[]>([]);
  const [totalMessagesCount, setTotalMessagesCount] = useState<number>(0);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [inputValue, setInputValue] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [loadingEarlier, setLoadingEarlier] = useState(false);
  const [isResponding, setIsResponding] = useState(false);
  const [pinOpen, setPinOpen] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinProcessing, setPinProcessing] = useState(false);
  const [pendingActionMsgId, setPendingActionMsgId] = useState<string | null>(
    null,
  );
  const [pendingQuoteCard, setPendingQuoteCard] = useState<Quote | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isResponding, scrollToBottom]);

  // Load recent sessions list
  const refreshSessionsList = useCallback(async () => {
    try {
      const res = await fetch("/api/chat/history?list=true");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.sessions)) {
          setSessions(data.sessions);
        }
      }
    } catch (err) {
      console.error("[ChatView] Error loading sessions list:", err);
    }
  }, []);

  // Initial mount: load latest chat session and list of sessions
  useEffect(() => {
    let mounted = true;

    async function initChat() {
      setLoading(true);
      try {
        const listRes = await fetch("/api/chat/history?list=true");
        if (listRes.ok) {
          const listData = await listRes.json();
          if (mounted && Array.isArray(listData.sessions)) {
            setSessions(listData.sessions);
          }
        }

        const latestRes = await fetch("/api/chat/history?latest=true");
        if (latestRes.ok) {
          const latestData = await latestRes.json();
          if (mounted && latestData.session) {
            setActiveSessionId(latestData.session.sessionId);
            setMessages(latestData.session.messages || []);
            setTotalMessagesCount(latestData.session.totalMessages || 0);
          }
        }
      } catch (err) {
        console.error("[ChatView] Error initializing chat:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    initChat();

    return () => {
      mounted = false;
    };
  }, []);

  // Switch to selected session from Recent dropdown
  const handleSelectSession = useCallback(
    async (sessionId: string) => {
      if (sessionId === activeSessionId) return;

      setLoading(true);
      setPendingQuoteCard(null);
      try {
        const res = await fetch(`/api/chat/history?sessionId=${sessionId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.session) {
            setActiveSessionId(data.session.sessionId);
            setMessages(data.session.messages || []);
            setTotalMessagesCount(data.session.totalMessages || 0);
          }
        }
      } catch (err) {
        console.error("[ChatView] Error loading session:", err);
      } finally {
        setLoading(false);
      }
    },
    [activeSessionId],
  );

  // Load all earlier messages for active thread
  const handleLoadAllMessages = useCallback(async () => {
    if (!activeSessionId || loadingEarlier) return;
    setLoadingEarlier(true);
    try {
      const res = await fetch(
        `/api/chat/history?sessionId=${activeSessionId}&all=true`,
      );
      if (res.ok) {
        const data = await res.json();
        if (data.session?.messages) {
          setMessages(data.session.messages);
          setTotalMessagesCount(data.session.messages.length);
        }
      }
    } catch (err) {
      console.error("[ChatView] Error loading all messages:", err);
    } finally {
      setLoadingEarlier(false);
    }
  }, [activeSessionId, loadingEarlier]);

  // Delete session handler
  const handleDeleteSession = useCallback(
    async (sessionId: string) => {
      try {
        const res = await fetch(`/api/chat/history?sessionId=${sessionId}`, {
          method: "DELETE",
        });
        if (res.ok) {
          setSessions((prev) => prev.filter((s) => s.sessionId !== sessionId));
          if (activeSessionId === sessionId) {
            setActiveSessionId(null);
            setMessages([]);
            setTotalMessagesCount(0);
          }
        }
      } catch (err) {
        console.error("[ChatView] Error deleting session:", err);
      }
    },
    [activeSessionId],
  );

  // Start fresh chat
  const handleStartNew = useCallback(() => {
    setActiveSessionId(null);
    setMessages([]);
    setTotalMessagesCount(0);
    setInputValue("");
    setIsResponding(false);
    setPinOpen(false);
    setPinError(null);
    setPendingQuoteCard(null);
  }, []);

  // Send message handler
  const handleSendMessage = useCallback(
    async (customText?: string) => {
      const textToSend = (customText || inputValue).trim();
      if (!textToSend || isResponding) return;

      setInputValue("");

      const tempUserMsg: IChatMessage = {
        id: `temp-${Date.now()}`,
        role: "user",
        content: textToSend,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, tempUserMsg]);
      setIsResponding(true);

      try {
        const res = await fetch("/api/chat/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: activeSessionId || undefined,
            message: textToSend,
          }),
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const data = await res.json();

        if (data.sessionId) {
          setActiveSessionId(data.sessionId);
        }

        if (data.assistantMessage) {
          setMessages((prev) => {
            const filtered = prev.filter((m) => m.id !== tempUserMsg.id);
            return [
              ...filtered,
              data.userMessage || tempUserMsg,
              data.assistantMessage,
            ];
          });
          setTotalMessagesCount((prev) => prev + 2);
        }

        refreshSessionsList();
      } catch (err) {
        console.error("[ChatView] Error sending message:", err);
        const errorMsg: IChatMessage = {
          id: `err-${Date.now()}`,
          role: "assistant",
          content:
            "Sorry, I had trouble sending that. Please check your connection and try again.",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMsg]);
      } finally {
        setIsResponding(false);
      }
    },
    [inputValue, isResponding, activeSessionId, refreshSessionsList],
  );

  // Raising PIN sheet on transaction card confirmation
  const handleOpenPin = useCallback(() => {
    const pendingMsg = messages.find(
      (m) => m.isTransaction && m.status === "pending",
    );
    setPendingActionMsgId(pendingMsg?.id || null);
    setPinError(null);
    setPinOpen(true);
  }, [messages]);

  const handleClosePin = useCallback(() => {
    setPinOpen(false);
    setPinError(null);
    setPinProcessing(false);
  }, []);

  // Complete PIN verification & execute transaction confirmation
  const handlePinComplete = useCallback(
    async (pin: string) => {
      if (!activeSessionId) return;

      setPinProcessing(true);
      setPinError(null);

      try {
        const res = await fetch("/api/chat/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: activeSessionId,
            messageId: pendingActionMsgId || undefined,
            pin,
            updatedCardData: pendingQuoteCard || undefined,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          setPinError(data.error || "PIN verification failed");
          setPinProcessing(false);
          return;
        }

        if (data.messages) {
          setMessages(data.messages);
        }

        setPendingQuoteCard(null);
        setPinProcessing(false);
        setPinOpen(false);
        refreshSessionsList();
      } catch (err) {
        console.error("[ChatView] Error confirming transaction:", err);
        setPinError("Network error during transaction verification");
        setPinProcessing(false);
      }
    },
    [
      activeSessionId,
      pendingActionMsgId,
      pendingQuoteCard,
      refreshSessionsList,
    ],
  );

  const started = messages.length > 0;
  const hasMoreMessages = totalMessagesCount > messages.length;
  const entries = messagesToChatEntries(messages);

  return (
    <div className="relative isolate flex min-h-dvh flex-col pb-4">
      <ChatBackdrop soft={started} />

      {/* Header */}
      {pinOpen ? null : (
        <ChatHeader
          onNew={handleStartNew}
          sessions={sessions}
          activeSessionId={activeSessionId}
          onSelectSession={handleSelectSession}
          onDeleteSession={handleDeleteSession}
        />
      )}

      {loading ? (
        <div className="flex flex-1 items-center justify-center pt-20">
          <div className="size-6 animate-spin rounded-full border-2 border-jumpa-primary-600 border-t-transparent" />
        </div>
      ) : started ? (
        <>
          <ChatTopFade />
          {/* pt clears ChatTopFade's 90px wash, which starts at the viewport top
              while the scroller starts below the 51px header. */}
          <div className="flex-1 overflow-y-auto pt-8 pb-2">
            {/* Load Earlier Messages Button */}
            {hasMoreMessages && (
              <div className="flex justify-center mb-3">
                <button
                  type="button"
                  onClick={handleLoadAllMessages}
                  disabled={loadingEarlier}
                  className="flex items-center gap-1.5 rounded-pill bg-jumpa-neutral-100 px-3.5 py-1.5 text-xs font-semibold text-jumpa-primary-950 transition-colors hover:bg-jumpa-neutral-200 active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  {loadingEarlier ? (
                    <>
                      <span className="size-3 animate-spin rounded-full border-2 border-jumpa-primary-600 border-t-transparent" />
                      Loading history...
                    </>
                  ) : (
                    `↑ Load earlier messages (${totalMessagesCount - messages.length} more)`
                  )}
                </button>
              </div>
            )}

            <Transcript
              entries={entries}
              onConfirm={handleOpenPin}
              onCancel={handleClosePin}
              onUpdateQuote={setPendingQuoteCard}
            />

            {/* Typing Indicator */}
            {isResponding && (
              <div className="flex items-center gap-2 px-4 py-2 mt-2">
                <span className="size-2 animate-pulse rounded-full bg-jumpa-primary-600" />
                <span className="text-xs text-jumpa-grey-600">
                  Jumpa is thinking...
                </span>
              </div>
            )}

            <div ref={scrollRef} />
          </div>
        </>
      ) : (
        <ChatIntro />
      )}

      {pinOpen ? null : (
        <ChatDock>
          {started ? null : (
            <SuggestionCard onSelect={(prompt) => handleSendMessage(prompt)} />
          )}
          <ChatComposer
            value={inputValue}
            onChange={setInputValue}
            onSend={() => handleSendMessage()}
            disabled={isResponding}
          />
        </ChatDock>
      )}

      {/* 6-Digit PIN Sheet Overlay */}
      {pinOpen ? (
        <PinSheet
          onClose={handleClosePin}
          onComplete={handlePinComplete}
          error={pinError}
          processing={pinProcessing}
        />
      ) : null}
    </div>
  );
}
