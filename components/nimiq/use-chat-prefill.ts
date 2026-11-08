"use client";

import { useEffect, useState } from "react";
import type { ChatHandoff, HandoffFlow } from "@/lib/nimiq/chat-handoff";

/** What the chat filled in for the screen it is about to open. */
let held: ChatHandoff | undefined;

export function holdChatPrefill(handoff: ChatHandoff) {
  held = handoff;
}

/** The chat's details when it opened this screen; taken once, so the next open starts empty. */
export function useChatPrefill<F extends HandoffFlow>(
  flow: F,
): Extract<ChatHandoff, { flow: F }> | undefined {
  const [prefill] = useState(() =>
    held?.flow === flow
      ? (held as Extract<ChatHandoff, { flow: F }>)
      : undefined,
  );
  useEffect(() => {
    if (held?.flow === flow) held = undefined;
  }, [flow]);
  return prefill;
}
