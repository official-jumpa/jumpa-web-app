import type { SVGProps } from "react";

export function GlobeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <g transform="translate(3 3)">
        <circle opacity="0.14" cx="9" cy="9" r="9" fill="currentColor" />
      </g>
      <g transform="translate(1.9992 1.9992)">
        <path
          d="M1 10H19M1 10C1 14.9706 5.02944 19 10 19M1 10C1 5.02944 5.02944 1 10 1M19 10C19 14.9706 14.9706 19 10 19M19 10C19 5.02944 14.9706 1 10 1M10 19C2.75561 11.08 6.98151 3.7 10 1M10 19C17.2444 11.08 13.0185 3.7 10 1"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}
