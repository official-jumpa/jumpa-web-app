import Image from "next/image";

/** White wash the transcript scrolls into. Kept out of ChatHeader so it survives the PIN sheet. */
export function ChatTopFade() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-0 z-10 mx-auto h-[calc(env(safe-area-inset-top)+170px)] max-w-[430px] overflow-hidden"
    >
      <div className="absolute inset-x-0 top-0 h-[calc(env(safe-area-inset-top)+90px)] bg-[image:var(--gradient-jumpa-chat-fade)] backdrop-blur-[1.3px] [-webkit-mask-image:var(--gradient-jumpa-chat-fade-mask)] [mask-image:var(--gradient-jumpa-chat-fade-mask)]" />
      <Image
        src="/images/chat/glow-top.svg"
        alt=""
        width={729}
        height={147}
        priority
        className="absolute top-[calc(env(safe-area-inset-top)+22px)] left-1/2 max-w-none -translate-x-1/2"
      />
    </div>
  );
}
