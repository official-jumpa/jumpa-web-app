import Image from "next/image";
import { DesignLayer } from "../design-layer";
import { SlideFrame, SlideHeading } from "../slide-frame";

export function HeroSlide() {
  return (
    <SlideFrame
      // Split matches the photo's top and bottom edge pixels, so taller viewports
      // read as a continuation of the sky and the sweater rather than a purple band.
      className="bg-[image:linear-gradient(to_bottom,#456fad_50%,#ae97c6_50%)]"
      primaryVariant="brand"
      secondaryVariant="ghostOnImage"
      stageArt={
        <>
          {/* 656x852 on the artboard: centre sits 42.48px right of the stage centre. */}
          <div className="pointer-events-none absolute inset-y-0 left-[calc(50%+42.48px)] aspect-[1312/1703] -translate-x-1/2 [mask-image:linear-gradient(to_bottom,transparent,#000_28px,#000_calc(100%-28px),transparent)]">
            <Image
              src="/images/onboarding/hero-sky.webp"
              alt=""
              fill
              priority
              sizes="700px"
              className="object-cover"
            />
          </div>

          <DesignLayer>
            <div className="absolute top-[477px] left-[54px] flex h-[60px] w-[262px] flex-col justify-center rounded-2xl bg-jumpa-white py-1.5 pr-[13px] pl-[7px]">
              <div className="flex items-center gap-2">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-[10px] bg-[linear-gradient(136.09deg,var(--color-jumpa-alt-200)_6.23%,var(--color-jumpa-alt-400)_103.18%)]">
                  <div className="relative h-3.5 w-[30px]">
                    <Image
                      src="/logo/mark/purple.png"
                      alt=""
                      fill
                      className="object-contain"
                      sizes="30px"
                    />
                  </div>
                </div>
                <div className="flex w-[196px] flex-col gap-0.5">
                  <p className="text-xs leading-[14px] font-semibold text-jumpa-black">
                    Jumpa
                  </p>
                  <p className="text-[10px] leading-3 font-normal text-[#393939]">
                    Your Swap was completed successfully open the app to
                    continue 🔥
                  </p>
                </div>
              </div>
            </div>
          </DesignLayer>
        </>
      }
    >
      <div className="pt-[84px]">
        <SlideHeading supporting="Send, swap, save, and spend across currencies and chains all in one conversation">
          <span className="text-[64px] leading-[60px] text-jumpa-alt-400">
            Chat,
          </span>
          <span className="text-[64px] leading-[60px]"> Don&apos;t Tap</span>
        </SlideHeading>
      </div>
    </SlideFrame>
  );
}
