import type { CSSProperties } from "react";

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
      className={className}
      style={style}
    />
  );
}
