import type { SVGProps } from "react";

export function MicrophoneIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <rect
        x="9"
        y="2"
        width="6"
        height="13"
        rx="3"
        fill="currentColor"
        opacity="0.14"
      />
      <g transform="translate(4 1)">
        <path
          d="M15 9V11C15 14.866 11.866 18 8 18M1 9V11C1 14.866 4.13401 18 8 18M8 18V21M4 21H12M11 5H9M11 9H9M8 14C6.34315 14 5 12.6569 5 11V4C5 2.34315 6.34315 1 8 1C9.65685 1 11 2.34315 11 4V11C11 12.6569 9.65685 14 8 14Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}
