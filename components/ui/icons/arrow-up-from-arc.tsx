import type { SVGProps } from "react";

export function ArrowUpFromArcIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <path
        opacity="0.14"
        d="M12 21C16.9706 21 21 16.9706 21 12V11H3V12C3 16.9706 7.02944 21 12 21Z"
        fill="currentColor"
      />
      <path
        d="M3 11V12C3 16.9706 7.02944 21 12 21C16.9706 21 21 16.9706 21 12V11M16 7L12 3L8 7M12 3V15"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
