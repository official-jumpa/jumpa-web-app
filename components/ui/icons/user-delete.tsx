import type { SVGProps } from "react";

/**
 * Custom dual-tone User Profile + Trash icon matching Jumpa's design system
 * (0.14 opacity volumetric fill for both the user and trash bin with solid 2px strokes).
 */
export function UserDeleteIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false" {...props}>
      {/* Dual-tone soft translucent fill for user & trash bin */}
      <g opacity="0.14" fill="currentColor">
        <circle cx="9" cy="7" r="4" />
        <path d="M9 13C5.134 13 2 16.134 2 20H12C12 18.5 12.4 17.1 13 16C12.1 15.3 11 14.8 9 14.8V13Z" />
        <path d="M14.5 14H20.5V19.5C20.5 20.3 19.8 21 19 21H16C15.2 21 14.5 20.3 14.5 19.5V14Z" />
      </g>

      {/* User outline */}
      <circle
        cx="9"
        cy="7"
        r="4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M2 20C2 16.134 5.134 13 9 13C10.2 13 11.3 13.3 12.3 13.8M2 20H12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Substantial, robust Trash Can with 2px stroke weight and lid */}
      {/* Lid handle */}
      <path
        d="M16 11.5H19"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Lid bar */}
      <path
        d="M13.5 13.5H21.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Bin bucket */}
      <path
        d="M14.5 13.5L15.2 19.4C15.3 20.3 16.1 21 17 21H18C18.9 21 19.7 20.3 19.8 19.4L20.5 13.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Vertical center rib */}
      <path
        d="M17.5 15.5V19"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
