import type { SVGProps } from "react";

export function ArrowDownArrowUpIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <g transform="translate(3.5 3)">
        <path
          d="M4 1V17M4 17L1 13.8M4 17L7 13.8M13 17V1M13 1L10 4.2M13 1L16 4.2"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}
