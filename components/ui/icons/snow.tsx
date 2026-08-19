import type { SVGProps } from "react";

export function SnowIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <g transform="translate(2 2)">
        <path
          d="M10 1V19M14 2L10 6L6.00878 2M6.00878 18L10 14L14 18M1 10H19M2 6L6.00878 10L2 14M18 14L14 10L18 6"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}
