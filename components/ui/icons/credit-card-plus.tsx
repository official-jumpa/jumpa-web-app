import type { SVGProps } from "react";

export function CreditCardPlusIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <g transform="translate(3 5)" opacity="0.14">
        <path
          d="M0 3.2C0 2.0799 0 1.51984 0.217987 1.09202C0.409734 0.715695 0.715695 0.409734 1.09202 0.217987C1.51984 0 2.0799 0 3.2 0H14.8C15.9201 0 16.4802 0 16.908 0.217987C17.2843 0.409734 17.5903 0.715695 17.782 1.09202C18 1.51984 18 2.0799 18 3.2V4H0V3.2Z"
          fill="currentColor"
        />
      </g>
      <g transform="translate(2 4)">
        <path
          d="M9 15H4.2C3.0799 15 2.51984 15 2.09202 14.782C1.7157 14.5903 1.40974 14.2843 1.21799 13.908C1 13.4802 1 12.9201 1 11.8V4.2C1 3.0799 1 2.51984 1.21799 2.09202C1.40974 1.7157 1.7157 1.40974 2.09202 1.21799C2.51984 1 3.0799 1 4.2 1H15.8C16.9201 1 17.4802 1 17.908 1.21799C18.2843 1.40974 18.5903 1.7157 18.782 2.09202C19 2.51984 19 3.0799 19 4.2V8M1 5H19M16 17V11M19 14.0008L13 14"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}
