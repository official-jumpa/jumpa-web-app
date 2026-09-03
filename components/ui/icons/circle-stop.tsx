import type { SVGProps } from "react";

export function CircleStopIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <path
        opacity={0.14}
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 21C16.9706 21 21 16.9706 21 12C21 7.02944 16.9706 3 12 3C7.02944 3 3 7.02944 3 12C3 16.9706 7.02944 21 12 21ZM10 9C9.44772 9 9 9.44772 9 10V14C9 14.5523 9.44772 15 10 15H14C14.5523 15 15 14.5523 15 14V10C15 9.44772 14.5523 9 14 9H10Z"
        fill="currentColor"
      />
      <path
        d="M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9 10.6C9 10.0399 9 9.75992 9.10899 9.54601C9.20487 9.35785 9.35785 9.20487 9.54601 9.10899C9.75992 9 10.0399 9 10.6 9H13.4C13.9601 9 14.2401 9 14.454 9.10899C14.6422 9.20487 14.7951 9.35785 14.891 9.54601C15 9.75992 15 10.0399 15 10.6V13.4C15 13.9601 15 14.2401 14.891 14.454C14.7951 14.6422 14.6422 14.7951 14.454 14.891C14.2401 15 13.9601 15 13.4 15H10.6C10.0399 15 9.75992 15 9.54601 14.891C9.35785 14.7951 9.20487 14.6422 9.10899 14.454C9 14.2401 9 13.9601 9 13.4V10.6Z"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
