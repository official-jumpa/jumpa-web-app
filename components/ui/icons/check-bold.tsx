import type { SVGProps } from "react";

/** Heavy tick inside a picked radio. Authored in a 14 box. */
export function CheckBoldIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <g transform="scale(1.7143)">
        <path
          d="M11.6667 3.5L5.25 9.91667L2.33333 7"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}
