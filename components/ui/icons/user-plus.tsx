import type { SVGProps } from "react";

// TODO: swap for the Figma vector when the leaderboard frame is shared.
export function UserPlusIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <path
        d="M15 20v-1.5c0-2.485-2.239-4.5-5-4.5s-5 2.015-5 4.5V20M13.5 7.5a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0ZM19 8v6M22 11h-6"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
