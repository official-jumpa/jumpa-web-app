"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { JumpaLoader } from "@/components/ui/jumpa-loader";
import { useScrollLock } from "@/hooks/use-scroll-lock";

/**
 * Work in progress, over a scrim. Portalled to the body and deliberately not
 * dismissable — there is nothing to go back to until it resolves.
 *
 * The spinner sits straight on the scrim: no panel behind it, so the screen
 * underneath stays readable and the mark reads as the app thinking rather than
 * as a card that has appeared.
 */
export function LoadingModal({ label }: { label: string }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useScrollLock(true);

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 mx-auto flex max-w-app items-center justify-center px-4.5">
      <div className="absolute inset-0 animate-fade bg-jumpa-black/60" />
      <JumpaLoader label={label} className="relative size-29 animate-pop-in" />
    </div>,
    document.body,
  );
}
