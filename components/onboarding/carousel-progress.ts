"use client";

import { createContext } from "react";

export type CarouselProgress = {
  /** Fractional position of the carousel: 0 = first slide, 1.5 = halfway to the third. */
  position: number;
  /** True while the board moves on its own, so the change runs as a CSS
   *  transition instead of a value tracking the finger. */
  animated: boolean;
};

export const CarouselProgressContext = createContext<CarouselProgress>({
  position: 0,
  animated: false,
});

/**
 * Signed distance from the current position to `index` on a track that wraps.
 * Positive means the slide is behind us and leaves to the left, so the last
 * slide hands over to the first without sweeping back across the others.
 */
export function slideOffset(progress: number, index: number, count: number) {
  const away = (((progress - index) % count) + count) % count;
  return away > count / 2 ? away - count : away;
}

/** How far `index` is from the current position, wrapped. */
export function slideDistance(progress: number, index: number, count: number) {
  return Math.abs(slideOffset(progress, index, count));
}
