import type { CSSProperties, ReactNode } from "react";

/** Cancels `lift` on a child, for artwork that must hold its artboard position. */
export const HOLDS_POSITION =
  "translate-y-[calc(var(--art-lift,0px)*var(--squeeze,0))]";

const LIFT = "translate-y-[calc(-1*var(--art-lift,0px)*var(--squeeze,0))]";

/**
 * 393x852 artboard space. `lift` raises artwork as the board tightens, reclaiming
 * the gap under the wordmark — which opts out via `HOLDS_POSITION`.
 */
export function DesignLayer({
  children,
  edgeArt,
  lift = 0,
}: {
  children: ReactNode;
  /**
   * Artwork measured from the stage's own edges instead of the artboard's, so it
   * keeps bleeding off the screen however wide the column gets. Only for pieces
   * the design runs off the edge — everything else belongs in `children`.
   */
  edgeArt?: ReactNode;
  lift?: number;
}) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
      style={{ "--art-lift": `${lift}px` } as CSSProperties}
    >
      <div
        className={`absolute top-0 left-1/2 h-full w-[393px] -translate-x-1/2 ${LIFT}`}
      >
        {children}
      </div>

      {edgeArt ? (
        <div className={`absolute inset-0 ${LIFT}`}>{edgeArt}</div>
      ) : null}
    </div>
  );
}
