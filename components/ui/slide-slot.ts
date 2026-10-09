import type { CSSProperties } from "react";

/** A layer under a row of options; moves on `translate` only, so the slide stays on the compositor. */
export const SLIDE_LAYER = "pointer-events-none absolute rounded-pill";
export const SLIDE_GLIDE = "transition-transform duration-300 ease-jumpa";

/**
 * Box and offset of slot `index` out of `count` equal columns. `gap` and `pad`
 * are the row's `gap-*` and `p-*` in spacing units.
 */
export function slideSlot(
  count: number,
  index: number,
  gap: number,
  pad = 0,
): CSSProperties {
  const g = `calc(var(--spacing) * ${gap})`;
  const p = `calc(var(--spacing) * ${pad})`;
  return {
    top: p,
    bottom: p,
    left: p,
    width: `calc((100% - 2 * ${p} - ${count - 1} * ${g}) / ${count})`,
    translate: `calc(${index} * (100% + ${g})) 0`,
  };
}
