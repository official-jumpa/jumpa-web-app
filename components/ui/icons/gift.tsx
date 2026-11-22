import type { SVGProps } from "react";

// TODO: swap for the Figma vector when the leaderboard frame is shared.
export function GiftIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <path
        d="M12 8v13M12 8H8.5a2.5 2.5 0 1 1 0-5C11 3 12 8 12 8Zm0 0h3.5a2.5 2.5 0 1 0 0-5C13 3 12 8 12 8ZM4 12h16v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-7ZM3 8h18v4H3V8Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
