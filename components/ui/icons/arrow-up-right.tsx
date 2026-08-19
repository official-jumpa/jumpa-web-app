import type { SVGProps } from "react";

export function ArrowUpRightIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <g transform="translate(6 6)">
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M1 1C1 0.447715 1.44772 0 2 0H11C11.5523 0 12 0.447715 12 1V10C12 10.5523 11.5523 11 11 11C10.4477 11 10 10.5523 10 10V3.41421L1.70711 11.7071C1.31658 12.0976 0.683418 12.0976 0.292893 11.7071C-0.0976311 11.3166 -0.0976311 10.6834 0.292893 10.2929L8.58579 2H2C1.44772 2 1 1.55228 1 1Z"
          fill="currentColor"
        />
      </g>
    </svg>
  );
}
