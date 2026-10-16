import type { SVGProps } from "react";

const STAR =
  "M12 2.5L14.94 8.46L21.52 9.42L16.76 14.06L17.88 20.61L12 17.52L6.12 20.61L7.24 14.06L2.48 9.42L9.06 8.46L12 2.5Z";

/** Hand-drawn in the set's two-layer idiom; `filled` paints it solid for a chosen rating. */
export function StarIcon({
  filled = false,
  ...props
}: SVGProps<SVGSVGElement> & { filled?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <path d={STAR} fill="currentColor" opacity="0.14" />
      <path
        d={STAR}
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
