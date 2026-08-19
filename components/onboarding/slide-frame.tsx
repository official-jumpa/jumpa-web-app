import type { ReactNode } from "react";
import { Button, type ButtonVariant } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { PaginationDots } from "./pagination-dots";

export const CREATE_WALLET_HREF = "/sign-up";
export const IMPORT_WALLET_HREF = "/sign-in";

/** Copy inset per Figma: 42 on screens 101/102, 33 on 135. Buttons are always 33. */
const COPY_GUTTER = { 33: "px-[33px]", 42: "px-[42px]" } as const;
export type CopyGutter = keyof typeof COPY_GUTTER;

type SlideFrameProps = {
  /** Full-bleed background, stretches to the viewport. */
  backdrop?: ReactNode;
  /** Art positioned against the 393x852 stage, so it tracks the copy. */
  stageArt?: ReactNode;
  children: ReactNode;
  gutter?: CopyGutter;
  primaryVariant?: ButtonVariant;
  secondaryVariant?: ButtonVariant;
  className?: string;
};

export function SlideFrame({
  backdrop,
  stageArt,
  children,
  gutter = 33,
  primaryVariant = "light",
  secondaryVariant = "ghost",
  className,
}: SlideFrameProps) {
  return (
    <article
      className={cn(
        "@container relative isolate flex h-dvh w-full shrink-0 snap-center items-center justify-center overflow-hidden",
        className,
      )}
    >
      {backdrop}

      {/* The artboard is a fixed 393x852; the board scales to whatever height it gets —
          every Figma proportion then holds, instead of the copy reflowing up into the
          artwork. The browser draws Figma's 54px "Status Bar - iPhone" and 21px "Home
          Indicator" (y=831) itself, so only the band between them has to fit. That is
          what keeps the board wide on a ~690px phone, and what lets it grow past 393
          on desktop, where the 430px column has width to spare.
          The widened box keeps artwork that bleeds off the design clipping at the
          column edge, not at the scaled board edge. */}
      <div
        className={cn(
          "relative flex shrink-0 origin-top flex-col self-start",
          // Below 777px of viewport the vertical gaps tighten *before* the board scales
          // down, so the board stays wider. 0 at 777px, fully tight at 688px. No element
          // changes size — only the whitespace between blocks.
          "[--squeeze:clamp(0,tan(atan2(calc(777px-100dvh),89px)),1)]",
          // 62px of gap comes out of the board: 38 above the heading, 14 above the dots,
          // 10 above the buttons. 38 is only reachable because DesignLayer lifts the
          // artwork 12px on slides 1-2, clearing slide 2's orbit ink (y=466, not its
          // box at 482) out of the heading's way.
          "[--board:calc(852px-62px*var(--squeeze))] h-[var(--board)]",
          // Figma's 54px status bar is chrome the browser draws; 11px more comes off the
          // gap above the logo.
          "[--chrome-top:calc(54px+11px*var(--squeeze))]",
          // 787 = 767 (the band from the status bar to the buttons) + 20px of bottom
          // margin; squeezing takes 84 of that off (62 board + 11 top + 11 bottom).
          // Capped by the width the board sits in — 393 on a phone, the carousel's
          // 430px column on desktop, where the omitted chrome leaves room to scale *up*.
          "[--fit:min(tan(atan2(100cqw,393px)),tan(atan2(100dvh,calc(787px-84px*var(--squeeze)))))]",
          // Positive slack = room to spare, negative = the board overflows.
          "[--slack:calc(100dvh-var(--board)*var(--fit))]",
          // Centre the board while it fits; past that pull the status-bar band off the
          // top and let the home indicator fall off the bottom.
          "[--lift:calc(max(0px,var(--slack))/2+max(calc(-1*var(--chrome-top)*var(--fit)),min(0px,var(--slack))))]",
          "[scale:var(--fit)] [translate:0_var(--lift)] [width:calc(100%/var(--fit))]",
        )}
      >
        {stageArt}

        {/* Copy shares the 393px artboard with DesignLayer, so the 33px gutter is
            measured from the same edge the artwork is. Without this the two drift
            apart on any viewport wider than 393. */}
        <div className="relative mx-auto flex w-full max-w-[393px] flex-1 flex-col">
          <div
            className={cn(
              "flex flex-1 flex-col pt-[env(safe-area-inset-top)]",
              COPY_GUTTER[gutter],
            )}
          >
            {children}
          </div>

          {/* The two gaps inside the footer tighten with the board (see --squeeze). */}
          <div className="mt-[calc(-14px*var(--squeeze))] px-[33px] pb-[calc(31px+env(safe-area-inset-bottom))]">
            <PaginationDots className="mb-[calc(15px-10px*var(--squeeze))]" />
            <div className="flex flex-col gap-2.5">
              <Button href={CREATE_WALLET_HREF} variant={primaryVariant}>
                Create new Wallet
              </Button>
              <Button href={IMPORT_WALLET_HREF} variant={secondaryVariant}>
                I Have an Existing Wallet
              </Button>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

export function SlideHeading({
  children,
  supporting,
  className,
}: {
  children: ReactNode;
  supporting: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex w-[309px] max-w-full flex-col gap-3 text-jumpa-white",
        className,
      )}
    >
      {/* leading-[0] drops the strut, so line height comes only from the sized spans. */}
      <h2 className="font-semibold leading-[0]">{children}</h2>
      <p className="text-sm leading-[18px] font-medium">{supporting}</p>
    </div>
  );
}
