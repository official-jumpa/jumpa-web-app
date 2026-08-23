import type { SVGProps } from "react";

export function KeyIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <g transform="translate(10.9992 3)" opacity="0.14">
        <circle opacity="0.14" cx="4.5" cy="4.5" r="4.5" fill="currentColor" />
      </g>
      <g transform="translate(3.0009 1.9992)">
        <path
          d="M9.32123 8.68519L1 17L3 19M4 14L6 16M17 5.5C17 7.98528 14.9853 10 12.5 10C10.0147 10 8 7.98528 8 5.5C8 3.01472 10.0147 1 12.5 1C14.9853 1 17 3.01472 17 5.5Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}
