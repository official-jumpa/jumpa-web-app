import Image from "next/image";
import { DesignLayer, HOLDS_POSITION } from "../design-layer";
import { GlowBackdrop } from "../glow-backdrop";
import { SlideFrame, SlideHeading } from "../slide-frame";

export function CoinsSlide({ index }: { index: number }) {
  return (
    <SlideFrame
      index={index}
      className="bg-jumpa-primary-600"
      gutter={42}
      backdrop={<GlowBackdrop spread="wide" />}
      stageArt={
        <DesignLayer lift={12}>
          <div
            className={`absolute top-[-43px] left-[54px] size-[286px] ${HOLDS_POSITION}`}
          >
            <Image
              src="/logo/white-logo-text.png"
              alt=""
              fill
              className="object-contain"
              sizes="286px"
            />
          </div>

          <div className="absolute top-[125px] left-1/2 size-[357px] -translate-x-1/2">
            <Image
              src="/images/onboarding/coin-orbit.webp"
              alt=""
              fill
              priority
              className="object-contain"
              sizes="357px"
            />
          </div>

          <div className="absolute top-[397px] left-[calc(75%+18.25px)] flex h-[107px] w-[104px] items-center justify-center">
            <div className="flex-none rotate-[15.82deg]">
              <Coin className="h-[88px] w-[83px]" />
            </div>
          </div>

          <div className="absolute top-[120px] left-[-76px] flex h-[144px] w-[139px] items-center justify-center">
            <div className="flex-none -scale-y-100 rotate-[164.18deg]">
              <Coin className="h-[118px] w-[111px]" />
            </div>
          </div>
        </DesignLayer>
      }
    >
      <div className="flex flex-1 flex-col justify-end pb-[22px]">
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

/** Crops the render down to the single centre coin, per the Figma fill transform. */
function Coin({ className }: { className: string }) {
  return (
    <div className={`relative overflow-hidden blur-[2.15px] ${className}`}>
      <Image
        src="/images/onboarding/coin.webp"
        alt=""
        width={512}
        height={512}
        sizes="300px"
        className="absolute top-[-72.22%] left-[-83.82%] h-[249.31%] w-[263.97%] max-w-none"
      />
    </div>
  );
}
