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

      {/* Stage caps at the 852px artboard so artwork and copy never drift apart. */}
      <div className="relative flex h-full max-h-[852px] w-full flex-col">
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

          <div className="px-[33px] pb-[calc(31px+env(safe-area-inset-bottom))]">
            <PaginationDots className="mb-[15px]" />
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
