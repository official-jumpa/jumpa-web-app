import type { SVGProps } from "react";

export function CirclePercentageIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <g transform="translate(2 2)">
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M10 0C4.47715 0 0 4.47715 0 10C0 15.5228 4.47715 20 10 20C15.5228 20 20 15.5228 20 10C20 4.47715 15.5228 0 10 0ZM14.2071 5.79289C14.5976 6.18342 14.5976 6.81658 14.2071 7.20711L7.20711 14.2071C6.81658 14.5976 6.18342 14.5976 5.79289 14.2071C5.40237 13.8166 5.40237 13.1834 5.79289 12.7929L12.7929 5.79289C13.1834 5.40237 13.8166 5.40237 14.2071 5.79289ZM6 7.5C6 6.67157 6.67157 6 7.5 6C8.32842 6 9 6.67157 9 7.5C9 8.32843 8.32843 9 7.5 9C6.67157 9 6 8.32842 6 7.5ZM12.5 11C11.6716 11 11 11.6716 11 12.5C11 13.3284 11.6716 14 12.5 14C13.3284 14 14 13.3284 14 12.5C14 11.6716 13.3284 11 12.5 11Z"
          fill="currentColor"
        />
      </g>
    </svg>
  );
}
