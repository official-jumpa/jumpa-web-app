import type { SVGProps } from "react";

/** Solid pause bars, the play glyph's sibling. */
export function PauseIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <path
        d="M7 5.5h2.6a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-11a1 1 0 0 1 1-1ZM14.4 5.5H17a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1h-2.6a1 1 0 0 1-1-1v-11a1 1 0 0 1 1-1Z"
        fill="currentColor"
      />
    </svg>
  );
}
