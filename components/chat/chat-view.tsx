"use client";

import { useCallback, useState } from "react";
import { ChatBackdrop } from "@/components/chat/chat-backdrop";
import { ChatDock } from "@/components/chat/chat-dock";
import { ChatHeader } from "@/components/chat/chat-header";
import { ChatIntro } from "@/components/chat/chat-intro";
import { ChatTopFade } from "@/components/chat/chat-top-fade";
import { PinSheet } from "@/components/chat/pin-sheet";
import { SuggestionCard } from "@/components/chat/suggestion-card";
import { Transcript } from "@/components/chat/transcript";
import type { ChatEntry } from "@/lib/chat";

/**
 * The chat screen and its two states — opening prompt and running conversation.
 * Confirming a proposal raises the PIN sheet over the controls and composer.
 */
export function ChatView({ entries: initial }: { entries: ChatEntry[] }) {
  const [entries, setEntries] = useState(initial);
  const [pinOpen, setPinOpen] = useState(false);

  const closePin = useCallback(() => setPinOpen(false), []);
  const openPin = useCallback(() => setPinOpen(true), []);
  // No backend yet: emptying the thread is what puts the intro state on screen.
  const startNew = useCallback(() => setEntries([]), []);

  const started = entries.length > 0;

  return (
    <div className="relative isolate flex min-h-dvh flex-col">
      <ChatBackdrop soft={started} />

      {started ? (
        <>
          <ChatTopFade />
          {pinOpen ? null : <ChatHeader onNew={startNew} />}
          <Transcript
            entries={entries}
            onConfirm={openPin}
            onCancel={closePin}
          />
        </>
      ) : (
        <ChatIntro />
      )}

      {pinOpen ? null : (
        <ChatDock>{started ? null : <SuggestionCard />}</ChatDock>
      )}

      {pinOpen ? (
        // The design shows nothing after a correct PIN, so it just dismisses.
        <PinSheet onClose={closePin} onComplete={closePin} />
      ) : null}
    </div>
  );
}
