import Image from "next/image";

/**
 * Purple glow rising from the bottom. Fixed, since the design holds it still as
 * the transcript scrolls; `soft` dials it back for the conversation frames.
 */
export function ChatBackdrop({ soft }: { soft?: boolean }) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 mx-auto max-w-[430px] overflow-hidden"
    >
      <div className="absolute inset-y-0 left-1/2 w-[393px] -translate-x-1/2">
        <Image
          src="/images/chat/glow-purple.svg"
          alt=""
          width={881}
          height={771}
          className={`absolute -bottom-104 -left-61 max-w-none ${soft ? "opacity-65" : ""}`}
        />
        {soft ? null : (
          <Image
            src="/images/chat/glow-white.svg"
            alt=""
            width={445}
            height={545}
            className="absolute -bottom-5 -left-8 max-w-none"
          />
        )}
      </div>
    </div>
  );
}
