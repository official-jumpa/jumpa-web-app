"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useScrollLock } from "@/hooks/use-scroll-lock";
import { cn } from "@/lib/cn";

/**
 * Bottom sheet raised from inside a screen. Portalled to the body because the
 * transfer screens set their own stacking contexts — a sheet rendered in place
 * paints under the nav no matter its z-index. Escape and the scrim both close.
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
    <div className="fixed inset-0 z-50 mx-auto flex max-w-app items-end px-2.5 pb-[calc(env(safe-area-inset-bottom)+10px)]">
      <button
        type="button"
        aria-label="Dismiss"
        onClick={onClose}
        className="absolute inset-0 animate-fade cursor-default bg-jumpa-black/60"
      />

      {/* max-h so a long sheet scrolls inside itself instead of off the screen. */}
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "relative max-h-[88dvh] w-full animate-sheet-up overflow-y-auto overscroll-contain rounded-sheet border border-jumpa-black/4 bg-jumpa-white px-4 pt-4 pb-4",
          className,
        )}
      >
        <span
          aria-hidden="true"
          className="mx-auto mb-3 block h-1.5 w-30 rounded-pill bg-jumpa-neutral-75"
        />
        {children}
      </div>
    </div>,
    document.body,
  );
}
