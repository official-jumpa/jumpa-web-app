import type { SVGProps } from "react";

export function ShareArrowIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <g transform="translate(3 2)">
        <path
          d="M9 14V1M9 1L5 5M9 1L13 5M1 12V15.8C1 16.9201 1 17.4802 1.21799 17.908C1.40974 18.2843 1.7157 18.5903 2.09202 18.782C2.51984 19 3.0799 19 4.2 19H13.8C14.9201 19 15.4802 19 15.908 18.782C16.2843 18.5903 16.5903 18.2843 16.782 17.908C17 17.4802 17 16.9201 17 15.8V12"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}
