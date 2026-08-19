import type { SVGProps } from "react";

export function SlidersIcon(props: SVGProps<SVGSVGElement>) {
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
          d="M10 3.5C10 4.88071 8.88071 6 7.5 6C6.11929 6 5 4.88071 5 3.5M10 3.5C10 2.11929 8.88071 1 7.5 1C6.11929 1 5 2.11929 5 3.5M10 3.5H19M5 3.5H1M17 10C17 11.3807 15.8807 12.5 14.5 12.5C13.1193 12.5 12 11.3807 12 10M17 10C17 8.61929 15.8807 7.5 14.5 7.5C13.1193 7.5 12 8.61929 12 10M17 10H19M12 10H1M8 16.5C8 17.8807 6.88071 19 5.5 19C4.11929 19 3 17.8807 3 16.5M8 16.5C8 15.1193 6.88071 14 5.5 14C4.11929 14 3 15.1193 3 16.5M8 16.5H19M3 16.5H1"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}
