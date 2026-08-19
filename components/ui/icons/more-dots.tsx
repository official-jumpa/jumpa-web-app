import type { SVGProps } from "react";

export function MoreDotsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <g transform="translate(4 10)">
        <g>
          <circle cx="2" cy="2" r="2" fill="currentColor" />
          <circle cx="8" cy="2" r="2" fill="currentColor" />
          <circle cx="14" cy="2" r="2" fill="currentColor" />
        </g>
      </g>
    </svg>
  );
}
