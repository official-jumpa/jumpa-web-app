"use client";

import type { ReactNode } from "react";
import { useSheetDrag } from "@/hooks/use-sheet-drag";
import { cn } from "@/lib/cn";

/** Scrim and grab handle per design generation; `lavender` is the newer violet-tinted pair. */
const TONE = {
  neutral: {
    scrim: "bg-jumpa-black/45",
    handle: "h-1 w-25 bg-jumpa-neutral-75",
  },
  lavender: {
    scrim: "bg-jumpa-ink/55",
    handle: "mt-0.5 -mb-0.5 h-1.25 w-10 bg-jumpa-lavender-200",
  },
} as const;

/** Dimmed overlay with a bottom panel. The scrim and a downward drag both close it. */
export function BottomSheet({
  onClose,
  pb = "pb-6",
  tone = "neutral",
  className,
  children,
}: {
  onClose: () => void;
  /** Bottom padding, as its own slot — `cn` is a plain join, so a `pb-*` in
   *  `className` would not reliably beat the default. */
  pb?: string;
  tone?: keyof typeof TONE;
  className?: string;
  children: ReactNode;
}) {
  const drag = useSheetDrag(onClose);

  return (
    <div className="fixed inset-0 z-30 mx-auto max-w-app flex items-end">
      <button
        type="button"
        aria-label="Dismiss"
        onClick={onClose}
        ref={drag.scrimRef}
        className={cn(
          "absolute inset-0 animate-fade cursor-default",
          TONE[tone].scrim,
        )}
      />

      <div
        {...drag.panelProps}
        className={cn(
          "relative w-full animate-sheet-up rounded-t-[32px] rounded-b-none bg-jumpa-white px-6 pt-3 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] shadow-2xl",
          className,
        )}
      >
        {/* Grab strip out to the panel's edges; the negative margins hold the
            design's spacing exactly. */}
        <div
          {...drag.handleProps}
          className="-mx-6 -mt-3 flex touch-none cursor-grab justify-center px-6 pt-3 pb-4 active:cursor-grabbing"
        >
          <span
            aria-hidden="true"
            className={cn("block rounded-full", TONE[tone].handle)}
          />
        </div>
        {children}
      </div>
    </div>
  );
}
