import type { SVGProps } from "react";

export function CreditCardNavIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <g transform="translate(2 4)">
        <path
          d="M1 5H19M5 11H7M4.2 15H15.8C16.9201 15 17.4802 15 17.908 14.782C18.2843 14.5903 18.5903 14.2843 18.782 13.908C19 13.4802 19 12.9201 19 11.8V4.2C19 3.0799 19 2.51984 18.782 2.09202C18.5903 1.7157 18.2843 1.40974 17.908 1.21799C17.4802 1 16.9201 1 15.8 1H4.2C3.0799 1 2.51984 1 2.09202 1.21799C1.7157 1.40974 1.40974 1.7157 1.21799 2.09202C1 2.51984 1 3.0799 1 4.2V11.8C1 12.9201 1 13.4802 1.21799 13.908C1.40974 14.2843 1.7157 14.5903 2.09202 14.782C2.51984 15 3.0799 15 4.2 15Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}
