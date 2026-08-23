import type { SVGProps } from "react";

export function UsersIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <g transform="translate(3 4.0008)" opacity="0.14">
        <g opacity="0.14">
          <path
            d="M5 6C6.65685 6 8 4.65685 8 3C8 1.34315 6.65685 0 5 0C3.34315 0 2 1.34315 2 3C2 4.65685 3.34315 6 5 6Z"
            fill="currentColor"
          />
          <path
            d="M0 14C0 11.2386 2.23858 9 5 9C7.76142 9 10 11.2386 10 14V16H0V14Z"
            fill="currentColor"
          />
        </g>
      </g>
      <g transform="translate(1.9992 3.0009)">
        <path
          d="M11 17V15C11 12.2386 8.76142 10 6 10C3.23858 10 1 12.2386 1 15V17H11ZM11 17H19V16C19 13.0545 16.7614 11 14 11C12.5867 11 11.3103 11.6255 10.4009 12.6311M9 4C9 5.65685 7.65685 7 6 7C4.34315 7 3 5.65685 3 4C3 2.34315 4.34315 1 6 1C7.65685 1 9 2.34315 9 4ZM16 6C16 7.10457 15.1046 8 14 8C12.8954 8 12 7.10457 12 6C12 4.89543 12.8954 4 14 4C15.1046 4 16 4.89543 16 6Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}
