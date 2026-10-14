"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useScrollLock } from "@/hooks/use-scroll-lock";
import { useSheetDrag } from "@/hooks/use-sheet-drag";
import { cn } from "@/lib/cn";

/**
 * Bottom sheet raised from inside a screen. Portalled to the body because the
 * transfer screens set their own stacking contexts — a sheet rendered in place
 * paints under the nav no matter its z-index. Escape, the scrim and a downward
 * drag all close it.
 */
export function SheetPortal({
  onClose,
  className,
  children,
}: {
  onClose: () => void;
  className?: string;
  children: ReactNode;
}) {
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
        className="absolute inset-0 animate-fade cursor-default bg-jumpa-black/60"
      />

      {/* max-h so a long sheet scrolls inside itself instead of off the screen. */}
      <div
        role="dialog"
        aria-modal="true"
        {...drag.panelProps}
        className={cn(
          "relative max-h-[90dvh] w-full animate-sheet-up overflow-y-auto overscroll-contain rounded-t-[32px] rounded-b-none border-t border-jumpa-black/5 bg-jumpa-white px-4.5 pt-0 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] shadow-2xl",
          className,
        )}
      >
        {/* The grab strip reaches the panel's own edges so the handle is easy to
            catch, and sticks so a scrolled sheet keeps it. It owns the panel's
            top padding, which is what holds the design's spacing exactly. */}
        <div
          {...drag.handleProps}
          className="sticky top-0 z-10 -mx-4.5 flex touch-none cursor-grab justify-center bg-jumpa-white px-4.5 pt-4 pb-3 active:cursor-grabbing rounded-t-[32px]"
        >
          <span
            aria-hidden="true"
            className="block h-1.5 w-30 rounded-pill bg-jumpa-neutral-75"
          />
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}
