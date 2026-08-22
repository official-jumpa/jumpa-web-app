import { AgentAvatar } from "@/components/chat/agent-avatar";

/** Opening state, before anything has been said. */
export function ChatIntro() {
  return (
    /* 118px from the viewport top in the design, less the 51px header above it. */
    <div className="flex flex-col px-4.5 pt-[67px]">
      <AgentAvatar />
      <p className="mt-2.75 text-xs leading-4 font-medium text-jumpa-black">
        Your Wallet is ready
      </p>
      <h1 className="mt-5.5 text-[40px] leading-10 font-medium text-jumpa-black">
        Start by sending money, swapping assets, or funding your wallet.
      </h1>
    </div>
  );
}
