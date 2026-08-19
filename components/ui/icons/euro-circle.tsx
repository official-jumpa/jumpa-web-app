import type { SVGProps } from "react";

export function EuroCircleIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <g transform="translate(3 3)">
        <circle opacity="0.14" cx="9" cy="9" r="9" fill="currentColor" />
      </g>
      <g transform="translate(2 2)">
        <path
          d="M14 6.94444C13.1834 5.76165 11.9037 5 10.4653 5C7.99917 5 6 7.23858 6 10C6 12.7614 7.99917 15 10.4653 15C11.9037 15 13.1834 14.2384 14 13.0556M5 8.5H9M5 11.5H9M19 10C19 14.9706 14.9706 19 10 19C5.02944 19 1 14.9706 1 10C1 5.02944 5.02944 1 10 1C14.9706 1 19 5.02944 19 10Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}
