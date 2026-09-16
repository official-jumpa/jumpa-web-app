import type { SVGProps } from "react";

/**
 * Outline house. The set's `house-line` is the filled nav glyph; this is the
 * stroked cut, for the field rows where it sits beside `mail` and `calendar`.
 * Hand-written in the set's two-layer idiom — no Figma source for this field.
 */
export function HouseAltIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <path
        d="M4 10.2 12 4l8 6.2V19a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-8.8Z"
        fill="currentColor"
        opacity="0.14"
      />
      <path
        d="M3 10.1 12 3.1l9 7M5 9.3V19a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.3M9.5 20v-5.5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1V20"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
