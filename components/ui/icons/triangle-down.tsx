import type { SVGProps } from "react";

/** Solid disclosure triangle on the chat filter pill. Distinct from CaretDownIcon. */
export function TriangleDownIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <path
        transform="rotate(180 6 6) translate(1.535 1)"
        d="M3.59957 0.5C3.98447 -0.166667 4.94672 -0.166667 5.33162 0.5L8.79572 6.5C9.18062 7.16667 8.69949 8 7.92969 8H1.00149C0.231692 8 -0.249434 7.16667 0.135466 6.5L3.59957 0.5Z"
        fill="currentColor"
      />
    </svg>
  );
}
