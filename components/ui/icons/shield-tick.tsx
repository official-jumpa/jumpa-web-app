import type { SVGProps } from "react";

/** Plain outlined shield with a tick — the consent line on the auto-save screens. Authored in an 18 box. */
export function ShieldTickIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <g
        transform="scale(1.3333)"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M15 9.75C15 13.5 12.375 15.375 9.255 16.4625C9.09162 16.5179 8.91415 16.5152 8.7525 16.455C5.625 15.375 3 13.5 3 9.75V4.5C3 4.30109 3.07902 4.11032 3.21967 3.96967C3.36032 3.82902 3.55109 3.75 3.75 3.75C5.25 3.75 7.125 2.85 8.43 1.71C8.58889 1.57425 8.79102 1.49966 9 1.49966C9.20898 1.49966 9.41111 1.57425 9.57 1.71C10.8825 2.8575 12.75 3.75 14.25 3.75C14.4489 3.75 14.6397 3.82902 14.7803 3.96967C14.921 4.11032 15 4.30109 15 4.5V9.75Z" />
        <path d="M6.75 9L8.25 10.5L11.25 7.5" />
      </g>
    </svg>
  );
}
