import type { SVGProps } from "react";

export function CloudIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <g transform="translate(3 5)">
        <path
          opacity="0.14"
          d="M0 8.64929C0 11.6044 2.41766 14 5.4 14L13.5 14C15.9853 14 18 11.9839 18 9.49687C18 7.65031 16.8893 5.94488 15.3 5.25C15.1317 2.32251 12.684 0 9.68926 0C7.35139 0 5.34694 1.48637 4.5 3.5C1.8 3.9375 0 6.20008 0 8.64929Z"
          fill="currentColor"
        />
      </g>
      <g transform="translate(2 4)">
        <path
          d="M1 9.64929C1 12.6044 3.41766 15 6.4 15L14.5 15C16.9853 15 19 12.9839 19 10.4969C19 8.65031 17.8893 6.94488 16.3 6.25C16.1317 3.32251 13.684 1 10.6893 1C8.35139 1 6.34694 2.48637 5.5 4.5C2.8 4.9375 1 7.20008 1 9.64929Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}
