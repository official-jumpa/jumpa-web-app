import type { CSSProperties } from "react";

/**
 * An element's place in a reveal run. `.reveal*` multiplies `--i` by `--step`
 * for its delay, so siblings deal themselves out in order — see the note in
 * `app/globals.css`. Written as a helper because `--i` is a custom property and
 * React's `CSSProperties` has no room for one without the cast.
 */
export function revealStep(index: number): CSSProperties {
  return { "--i": index } as CSSProperties;
}
