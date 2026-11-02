import type { SVGProps } from "react";

/** Wide, heavy dash on a debit-to-bank row (charm:minus). */
export function MinusBoldIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <path
        d="M10.9999 6H0.99986"
        stroke="currentColor"
        strokeWidth="1.97143"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
