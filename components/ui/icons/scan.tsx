import type { SVGProps } from "react";

export function ScanIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <g transform="translate(3 3)">
        <path
          d="M1 6V4.2C1 3.0799 1 2.51984 1.21799 2.09202C1.40974 1.7157 1.7157 1.40974 2.09202 1.21799C2.51984 1 3.0799 1 4.2 1H6M12 1H13.8C14.9201 1 15.4802 1 15.908 1.21799C16.2843 1.40974 16.5903 1.7157 16.782 2.09202C17 2.51984 17 3.0799 17 4.2V6M17 12V13.8C17 14.9201 17 15.4802 16.782 15.908C16.5903 16.2843 16.2843 16.5903 15.908 16.782C15.4802 17 14.9201 17 13.8 17H12M6 17H4.2C3.0799 17 2.51984 17 2.09202 16.782C1.7157 16.5903 1.40974 16.2843 1.21799 15.908C1 15.4802 1 14.9201 1 13.8V12M0 9H18"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}
