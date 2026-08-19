import type { SVGProps } from "react";

export function CoinFrontIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <g transform="translate(2 2)">
        <g>
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M10 4C6.68629 4 4 6.68629 4 10C4 13.3137 6.68629 16 10 16C13.3137 16 16 13.3137 16 10C16 6.68629 13.3137 4 10 4ZM11 8C11 7.44772 10.5523 7 10 7C9.44771 7 9 7.44772 9 8V12C9 12.5523 9.44771 13 10 13C10.5523 13 11 12.5523 11 12V8Z"
            fill="currentColor"
          />
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M10 0C4.47715 0 0 4.47715 0 10C0 15.5228 4.47715 20 10 20C15.5228 20 20 15.5228 20 10C20 4.47715 15.5228 0 10 0ZM2 10C2 5.58172 5.58172 2 10 2C14.4183 2 18 5.58172 18 10C18 14.4183 14.4183 18 10 18C5.58172 18 2 14.4183 2 10Z"
            fill="currentColor"
          />
        </g>
      </g>
    </svg>
  );
}
