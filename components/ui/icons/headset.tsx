import type { SVGProps } from "react";

/**
 * Modern dual-tone customer support headset icon matching Jumpa's icon set
 * (0.14 opacity tinted fill with 2px stroke outline).
 */
export function HeadsetIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {/* 0.14 opacity soft volume fill */}
      <g opacity="0.14" fill="currentColor">
        <rect x="2" y="11" width="4" height="7" rx="2" />
        <rect x="18" y="11" width="4" height="7" rx="2" />
        <path d="M12 3C7.02944 3 3 7.02944 3 12V13H5V12C5 8.13401 8.13401 5 12 5C15.866 5 19 8.13401 19 12V13H21V12C21 7.02944 16.9706 3 12 3Z" />
      </g>

      {/* Main headband and ear-pads */}
      <path
        d="M3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <rect
        x="2"
        y="11"
        width="4"
        height="7"
        rx="2"
        stroke="currentColor"
        strokeWidth="2"
      />
      <rect
        x="18"
        y="11"
        width="4"
        height="7"
        rx="2"
        stroke="currentColor"
        strokeWidth="2"
      />

      {/* Microphone boom and capsule */}
      <path
        d="M20 18V19C20 20.1046 19.1046 21 18 21H14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="13" cy="21" r="1" fill="currentColor" />
    </svg>
  );
}
