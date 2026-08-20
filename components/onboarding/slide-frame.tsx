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
        "relative isolate flex h-dvh w-full shrink-0 snap-center items-center justify-center overflow-hidden",
        className,
      )}
    >
      {backdrop}

      {/* The 393x852 board scales to the height it gets, so every Figma proportion
          holds instead of the copy reflowing into the artwork. Only the band between
          the status bar and home indicator has to fit — the browser draws those. */}
      <div
        className={cn(
          "relative flex shrink-0 origin-top flex-col self-start",
          // --fit, --squeeze and --vh are measured in board-fit.tsx; the fallbacks
          // here render the board at its native Figma size if that never runs.
          // 62px of gap comes out of the board: 38 above the heading, 14 above the
          // dots, 10 above the buttons. DesignLayer's 12px lift is what allows the 38.
          "[--board:calc(852px-62px*var(--squeeze,0))] h-[var(--board)]",
          // Figma's status bar is chrome the browser draws, plus 11px off the logo gap.
          "[--chrome-top:calc(54px+11px*var(--squeeze,0))]",
          // Positive slack = room to spare, negative = the board overflows.
          "[--slack:calc(var(--vh,100dvh)-var(--board)*var(--fit,1))]",
          // Centre while it fits; past that pull the status-bar band off the top.
          "[--lift:calc(max(0px,var(--slack))/2+max(calc(-1*var(--chrome-top)*var(--fit,1)),min(0px,var(--slack))))]",
          "[scale:var(--fit,1)] [translate:0_var(--lift)] [width:calc(100%/var(--fit,1))]",
        )}
      >
        {stageArt}

        {/* Copy shares DesignLayer's 393px artboard so the gutter is measured from
            the same edge as the artwork; without it the two drift apart above 393. */}
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
          <div className="mt-[calc(-14px*var(--squeeze,0))] px-[33px] pb-[calc(31px+env(safe-area-inset-bottom))]">
            <PaginationDots className="mb-[calc(15px-10px*var(--squeeze,0))]" />
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
