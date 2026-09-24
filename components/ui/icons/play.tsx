import type { SVGProps } from "react";

/** Solid play triangle. Hand-written — the voice controls have no Figma source. */
export function PlayIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <path
        d="M8.5 5.6a1 1 0 0 1 1.52-.85l9.1 5.5a1 1 0 0 1 0 1.7l-9.1 5.5a1 1 0 0 1-1.52-.85V5.6Z"
        fill="currentColor"
      />
    </svg>
  );
}
