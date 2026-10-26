"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { JumpaLoader } from "@/components/ui/jumpa-loader";
import { useScrollLock } from "@/hooks/use-scroll-lock";

/**
 * Work in progress, over a blurred scrim. Portalled to the body, above every
 * sheet, and deliberately not dismissable — nothing on screen can be touched
 * until it resolves.
 *
 * The spinner sits straight on the scrim: no panel behind it, so the mark
 * reads as the app thinking rather than as a card that has appeared.
 */
export function LoadingModal({
  label,
  caption = false,
}: {
  /** Announced to screen readers. */
  label: string;
  /** Also prints `label` under the loader. */
  caption?: boolean;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useScrollLock(true);

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-70 mx-auto flex max-w-app items-center justify-center px-4.5">
      <div className="absolute inset-0 animate-fade bg-jumpa-black/60 backdrop-blur-sm" />
      <div className="relative flex animate-pop-in flex-col items-center gap-4">
        <JumpaLoader label={label} />
        {caption ? (
          // Already announced by the loader's own live region.
          <p
            aria-hidden="true"
            className="text-center text-sm font-medium text-jumpa-white"
          >
            {label}
          </p>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
