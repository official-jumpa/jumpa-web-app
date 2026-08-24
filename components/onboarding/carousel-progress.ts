"use client";

import { createContext } from "react";

/** Fractional scroll position of the carousel: 0 = first slide, 1.5 = halfway to the third. */
export const CarouselProgressContext = createContext(0);

/**
 * How far `index` is from the current position on a track that wraps, so the
 * clone past the last slide reads as the first one instead of falling off.
 * Identical to the plain distance everywhere the carousel rests.
 */
export function slideDistance(progress: number, index: number, count: number) {
  const away = Math.abs(progress - index);
  return Math.min(away, count - away);
}
