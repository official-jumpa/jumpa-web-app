import type { CSSProperties } from "react";
import { cn } from "@/lib/cn";

/** Decorative vector artwork: hidden from assistive tech, sized by its box. */
export function Art({
  src,
  className,
  style,
}: {
  src: string;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    // biome-ignore lint/performance/noImgElement: next/image does not optimise SVGs, and its `fill` fights the design's coordinates.
    <img
      src={src}
      alt=""
      aria-hidden="true"
      draggable={false}
      // Preflight caps an img at its parent's width, which squeezes art the
      // design deliberately draws wider than its card.
      className={cn("max-w-none", className)}
      style={style}
    />
  );
}
