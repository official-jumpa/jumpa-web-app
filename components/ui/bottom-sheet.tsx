"use client";

import type { ReactNode } from "react";
import { useSheetDrag } from "@/hooks/use-sheet-drag";
import { cn } from "@/lib/cn";

/** Dimmed overlay with a bottom panel. The scrim and a downward drag both close it. */
export function BottomSheet({
  onClose,
  pb = "pb-6",
  className,
  children,
}: {
  onClose: () => void;
  /** Bottom padding, as its own slot — `cn` is a plain join, so a `pb-*` in
   *  `className` would not reliably beat the default. */
  pb?: string;
  className?: string;
  children: ReactNode;
}) {
  const drag = useSheetDrag(onClose);

  return (
    <div className="fixed inset-0 z-30 mx-auto max-w-app">
      <button
        type="button"
        aria-label="Dismiss"
        onClick={onClose}
        ref={drag.scrimRef}
        className="absolute inset-0 animate-fade cursor-default bg-jumpa-black/45"
      />

      <div
        {...drag.panelProps}
        className={cn(
          "absolute inset-x-2.5 bottom-[calc(env(safe-area-inset-bottom)+10px)] animate-sheet-up rounded-sheet bg-jumpa-white px-6 pt-3",
          pb,
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
            className="block h-1 w-25 rounded-full bg-jumpa-neutral-75"
          />
        </div>
        {children}
      </div>
    </div>
  );
}
