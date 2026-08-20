import { AgentAvatar } from "@/components/chat/agent-avatar";

/** Opening state, before anything has been said. */
export function ChatIntro() {
  return (
    <div className="flex flex-col px-4.5 pt-[calc(env(safe-area-inset-top)+118px)]">
      <AgentAvatar />
      <h1 className="mt-12 text-[40px] leading-10 font-medium text-jumpa-black">
        Start by sending money, swapping assets, or funding your wallet.
      </h1>
    </div>
  );
}
