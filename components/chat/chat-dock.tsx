import type { ReactNode } from "react";

/** Frosted panel at the foot of the chat: contains composer and optional suggestion chips. */
export function ChatDock({ children }: { children?: ReactNode }) {
  return (
    <div className="sticky bottom-0 mt-auto z-20 px-3 pt-2 pb-[calc(env(safe-area-inset-bottom)+14px)]">
      <div className="flex flex-col gap-2.5 rounded-dock bg-jumpa-black/10 p-2.5 backdrop-blur-md">
        {children}
      </div>
    </div>
  );
}
