import Image from "next/image";
import { DesignLayer, HOLDS_POSITION } from "../design-layer";
import { GlowBackdrop } from "../glow-backdrop";
import { SlideFrame, SlideHeading } from "../slide-frame";

export function ChatSlide({
  index,
  clone,
}: {
  index: number;
  clone?: boolean;
}) {
  return (
    <SlideFrame
      index={index}
      clone={clone}
      className="bg-jumpa-primary-600"
      gutter={42}
      backdrop={<GlowBackdrop />}
      stageArt={
        <DesignLayer lift={12}>
          <div
            className={`absolute top-[-53px] left-[54px] size-[286px] ${HOLDS_POSITION}`}
          >
            <Image
              src="/logo/white-logo-text.png"
              alt=""
              fill
              priority
              className="object-contain"
              sizes="286px"
            />
          </div>

          <div className="absolute top-[135px] left-6 h-[582px] w-[345px]">
            <Image
              src="/images/onboarding/phone-mock.svg"
              alt=""
              fill
              sizes="345px"
            />
          </div>

          <div className="absolute top-[223px] left-[calc(25%+43.75px)] flex w-[209px] flex-col items-end gap-2.5">
            <ChatBubble>Heyyy Jumpa!</ChatBubble>
            <ChatBubble className="w-full">Send $251 to Bharry</ChatBubble>
          </div>

          <div className="absolute top-[348px] left-[42px] flex items-start gap-2">
            <div className="flex size-[38px] shrink-0 flex-col rounded-[19px] bg-[image:var(--gradient-jumpa-avatar)] pt-[13px] pr-2 pb-[13px] pl-[7px]">
              <div className="relative h-3 w-[23px]">
                <Image
                  src="/logo/mark/lemon.png"
                  alt=""
                  fill
                  className="object-contain"
                  sizes="23px"
                />
              </div>
            </div>
            <div className="flex flex-col gap-1 rounded-card border border-jumpa-primary-100 bg-jumpa-primary-50 px-2 pt-2 pb-[9px] shadow-jumpa-card">
              <p className="font-display text-5xl leading-[48px] font-extrabold text-jumpa-primary-600">
                +$251
              </p>
              <p className="rounded-t-[2px] rounded-b-[10px] bg-jumpa-primary-100 p-2.5 text-center text-xs leading-[14px] font-semibold text-jumpa-primary-600">
                Sent to Bharry Successfully 🎉
              </p>
            </div>
          </div>
        </DesignLayer>
      }
    >
      <div className="flex flex-1 flex-col justify-end pb-[20px]">
        <SlideHeading supporting="Send, swap, save, and spend across currencies and chains all in one conversation">
          <span className="text-[32px] leading-[34px]">
            Move Money as Naturally as you{" "}
          </span>
          <span className="text-[36px] leading-[34px]">Chat</span>
        </SlideHeading>
      </div>
    </SlideFrame>
  );
}

function ChatBubble({
  children,
  className,
}: {
  children: string;
  className?: string;
}) {
  return (
    <div
      className={`flex items-center justify-center rounded-pill border border-jumpa-alt-200 bg-[image:var(--gradient-jumpa-chip)] px-7 py-3.5 ${className ?? ""}`}
    >
      <p className="text-center text-base leading-[18px] font-medium whitespace-nowrap text-jumpa-black">
        {children}
      </p>
    </div>
  );
}
