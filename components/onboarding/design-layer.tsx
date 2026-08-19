import type { CSSProperties, ReactNode } from "react";

/** Cancels `lift` on a child, for artwork that must hold its artboard position. */
export const HOLDS_POSITION =
  "translate-y-[calc(var(--art-lift,0px)*var(--squeeze,0))]";

/**
 * 393x852 coordinate space from Figma. Artwork offsets are relative to this box.
 *
 * `lift` raises the artwork by that many design px as the board tightens (`--squeeze`
 * in SlideFrame), reclaiming the gap under the wordmark on short viewports. The
 * wordmark itself opts out with `HOLDS_POSITION` — that gap is the point.
 */
export function DesignLayer({
  children,
  lift = 0,
}: {
  children: ReactNode;
  lift?: number;
}) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      <div
        className="absolute top-0 left-1/2 h-full w-[393px] -translate-x-1/2 translate-y-[calc(-1*var(--art-lift,0px)*var(--squeeze,0))]"
        style={{ "--art-lift": `${lift}px` } as CSSProperties}
      >
        {children}
      </div>
    </div>
  );
}
