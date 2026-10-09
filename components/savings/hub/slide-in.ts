import type { CSSProperties } from "react";
import type { SlideDirection } from "@/lib/savings-hub";

/**
 * Motion for content that changed with the currency: it enters from the side
 * the thumb moved toward, `index` steps apart. `null` is a first paint, which
 * does not move. Opacity and transform only, so no layout shifts while it runs.
 */
export function slideIn(
  direction: SlideDirection | null,
  index = 0,
): { className?: string; style?: CSSProperties } {
  if (!direction) return {};
  return {
    className: "animate-slide-in stagger",
    style: {
      "--slide-from": direction === "right" ? "1.5rem" : "-1.5rem",
      "--i": index,
    } as CSSProperties,
  };
}
