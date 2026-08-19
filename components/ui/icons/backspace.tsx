import type { SVGProps } from "react";

/** Keypad delete key. The viewBox is the glyph's box inside the exported key. */
export function BackspaceIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="31.7038 19 40.9629 26"
      fill="none"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <path
        d="M38.8573 21.6796C40.3753 19.975 42.5492 19 44.8317 19H64.6667C69.085 19 72.6667 22.5817 72.6667 27V37C72.6667 41.4183 69.0849 45 64.6667 45H44.8317C42.5492 45 40.3753 44.025 38.8573 42.3204L34.4047 37.3204C31.7038 34.2876 31.7038 29.7124 34.4047 26.6796L38.8573 21.6796Z"
        fill="currentColor"
      />
      <g
        stroke="var(--color-jumpa-white)"
        strokeWidth="2"
        strokeLinecap="round"
      >
        <line x1="58.9093" y1="27.7574" x2="50.424" y2="36.2426" />
        <line x1="50.424" y1="27.7574" x2="58.9093" y2="36.2426" />
      </g>
    </svg>
  );
}
