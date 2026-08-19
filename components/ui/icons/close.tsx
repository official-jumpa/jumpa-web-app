import type { SVGProps } from "react";

/** Figma draws this as a plus turned 45 degrees, hence the rotation. */
export function CloseIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <g
        transform="rotate(45 12 12) translate(5 5)"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      >
        <line x1="7" y1="1" x2="7" y2="13" />
        <line x1="1" y1="7" x2="13" y2="7" />
      </g>
    </svg>
  );
}
