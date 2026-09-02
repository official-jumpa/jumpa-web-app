import type { SVGProps } from "react";

export function BankIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <path
        opacity="0.14"
        d="M9.87404 3.88962C10.6263 3.22096 11.0024 2.88663 11.4268 2.75967C11.8008 2.64782 12.1992 2.64782 12.5732 2.75967C12.9976 2.88663 13.3737 3.22096 14.126 3.88962L21 9.99987H3L9.87404 3.88962Z"
        fill="currentColor"
      />
      <path
        d="M3 21H21M4 18H20M6 18V13M10 18V13M14 18V13M18 18V13M12 7.00684L12.0074 7.0001M21 10L14.126 3.88975C13.3737 3.22109 12.9976 2.88676 12.5732 2.7598C12.1992 2.64795 11.8008 2.64795 11.4268 2.7598C11.0024 2.88676 10.6263 3.22109 9.87404 3.88975L3 10H21Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
