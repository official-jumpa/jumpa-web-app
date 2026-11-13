import type { SVGProps } from "react";

/** Four-point spark with a plus beside it. Authored in an 18 box. */
export function SparkIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <g
        transform="scale(1.3333)"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M10.455 10.545L9 15L7.545 10.545L3 9L7.545 7.455L9 3L10.455 7.455L15 9L10.455 10.545Z" />
        <path d="M15 2.25V3.75M15 3.75V5.25M15 3.75H16.5M15 3.75H13.5" />
      </g>
    </svg>
  );
}
