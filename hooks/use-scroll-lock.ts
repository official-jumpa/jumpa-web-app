import { useEffect } from "react";

let lockCount = 0;
let originalStyles: {
  htmlOverflow: string;
  bodyOverflow: string;
  bodyPaddingRight: string;
} | null = null;

/**
 * Freezes the page behind an overlay. Pads for the scrollbar so nothing shifts.
 * Uses global reference counting so nested or overlapping overlays (e.g. PinSheet + LoadingModal,
 * or SheetPortal + ResultSheet) never leave the body permanently locked with overflow: hidden.
 */
export function useScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked || typeof document === "undefined") return;

    const { body, documentElement: html } = document;

    if (lockCount === 0) {
      originalStyles = {
        htmlOverflow: html.style.overflow === "hidden" ? "" : html.style.overflow,
        bodyOverflow: body.style.overflow === "hidden" ? "" : body.style.overflow,
        bodyPaddingRight: body.style.paddingRight,
      };

      const gap = window.innerWidth - html.clientWidth;
      html.style.overflow = "hidden";
      body.style.overflow = "hidden";
      if (gap > 0) body.style.paddingRight = `${gap}px`;
    }

    lockCount++;

    return () => {
      lockCount = Math.max(0, lockCount - 1);

      if (lockCount === 0) {
        html.style.overflow = originalStyles?.htmlOverflow ?? "";
        body.style.overflow = originalStyles?.bodyOverflow ?? "";
        body.style.paddingRight = originalStyles?.bodyPaddingRight ?? "";
        originalStyles = null;
      }
    };
  }, [locked]);
}

/**
 * Force-releases all active scroll locks (e.g. on route navigation or unhandled dismissal).
 */
export function forceReleaseScrollLock() {
  if (typeof document === "undefined") return;
  lockCount = 0;
  originalStyles = null;
  document.documentElement.style.overflow = "";
  document.body.style.overflow = "";
  document.body.style.paddingRight = "";
}
