import type { ReactNode } from "react";
import { ChatComposer } from "@/components/chat/chat-composer";

/**
 * Frosted panel pinned to the bottom of the chat. It holds the composer, and on
 * the intro screen the suggestion card above it.
 */
export function ChatDock({ children }: { children?: ReactNode }) {
  return (
    <div className="sticky bottom-0 mt-auto px-3 pt-2 pb-[calc(env(safe-area-inset-bottom)+14px)]">
      <div className="flex flex-col gap-2.5 rounded-dock bg-jumpa-black/10 p-2.5">
        {children}
        <ChatComposer />
      </div>
    </div>
  );
}
