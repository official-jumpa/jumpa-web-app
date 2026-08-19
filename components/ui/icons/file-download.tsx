import type { SVGProps } from "react";

export function FileDownloadIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <g transform="translate(2 3)">
        <path
          d="M15 14H15.01M15.4 11H16C16.9319 11 17.3978 11 17.7654 11.1522C18.2554 11.3552 18.6448 11.7446 18.8478 12.2346C19 12.6022 19 13.0681 19 14C19 14.9319 19 15.3978 18.8478 15.7654C18.6448 16.2554 18.2554 16.6448 17.7654 16.8478C17.3978 17 16.9319 17 16 17H4C3.06812 17 2.60218 17 2.23463 16.8478C1.74458 16.6448 1.35523 16.2554 1.15224 15.7654C1 15.3978 1 14.9319 1 14C1 13.0681 1 12.6022 1.15224 12.2346C1.35523 11.7446 1.74458 11.3552 2.23463 11.1522C2.60218 11 3.06812 11 4 11H4.6M10 12V1M13 9L10 12L7 9"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}
