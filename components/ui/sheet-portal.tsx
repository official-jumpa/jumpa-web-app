"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useScrollLock } from "@/hooks/use-scroll-lock";
import { useSheetDrag } from "@/hooks/use-sheet-drag";
import { cn } from "@/lib/cn";

/** `account` is the delete-account sheet: ink scrim, small lavender handle, wider gutter. */
const LOOK = {
  default: {
    scrim: "bg-jumpa-black/60",
    panel: "px-4.5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)]",
    strip: "-mx-4.5 px-4.5 pt-4 pb-3",
    handle: "h-1.5 w-30 bg-jumpa-neutral-75",
  },
  account: {
    scrim: "bg-jumpa-ink/55",
    panel: "px-5.5 pb-[calc(env(safe-area-inset-bottom)+2.5rem)]",
    strip: "-mx-5.5 px-5.5 pt-3.5 pb-3.5",
    handle: "h-1.25 w-10 bg-jumpa-lavender-200",
  },
} as const;

/**
 * Bottom sheet raised from inside a screen. Portalled to the body because the
 * transfer screens set their own stacking contexts — a sheet rendered in place
 * paints under the nav no matter its z-index. Escape, the scrim and a downward
 * drag all close it.
 */
export function SheetPortal({
  onClose,
  look = "default",
  className,
  children,
}: {
  onClose: () => void;
  look?: keyof typeof LOOK;
  className?: string;
  children: ReactNode;
}) {
  const style = LOOK[look];
  const drag = useSheetDrag(onClose);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useScrollLock(true);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 mx-auto flex max-w-app items-end">
      <button
        type="button"
        aria-label="Dismiss"
        onClick={onClose}
        ref={drag.scrimRef}
        className={`absolute inset-0 animate-fade cursor-default ${style.scrim}`}
      />

      {/* max-h so a long sheet scrolls inside itself instead of off the screen. */}
      <div
        role="dialog"
        aria-modal="true"
        {...drag.panelProps}
        className={cn(
          "relative max-h-[90dvh] w-full animate-sheet-up overflow-y-auto overscroll-contain rounded-t-[32px] rounded-b-none border-t border-jumpa-black/5 bg-jumpa-white pt-0 shadow-2xl",
          style.panel,
          className,
        )}
      >
        {/* The grab strip reaches the panel's own edges so the handle is easy to
            catch, and sticks so a scrolled sheet keeps it. It owns the panel's
            top padding, which is what holds the design's spacing exactly. */}
        <div
          {...drag.handleProps}
          className={`sticky top-0 z-10 flex touch-none cursor-grab justify-center rounded-t-[32px] bg-jumpa-white active:cursor-grabbing ${style.strip}`}
        >
          <span
            aria-hidden="true"
            className={`block rounded-pill ${style.handle}`}
          />
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}
