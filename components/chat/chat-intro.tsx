import { AgentAvatar } from "@/components/chat/agent-avatar";

const TITLE =
  "Start by sending money, swapping assets, or funding your wallet.";

/** Opening state, before anything has been said. */
export function ChatIntro({ title = TITLE }: { title?: string } = {}) {
  return (
    /* 118px from the viewport top in the design, less the 51px header above it. */
    <div className="flex flex-col px-4.5 pt-[67px]">
      <AgentAvatar />

      <h1 className="mt-10 text-[38px] leading-10 font-medium text-jumpa-black">
        {title}
      </h1>
    </div>
  );
}
