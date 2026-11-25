import type { SVGProps } from "react";

export function CircleDollarIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 22 22"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <path d="M19.25 11C19.25 15.5563 15.5563 19.25 11 19.25C6.44365 19.25 2.75 15.5563 2.75 11C2.75 6.44365 6.44365 2.75 11 2.75C15.5563 2.75 19.25 6.44365 19.25 11Z" />
      <path d="M11 6.41667V15.5833M8.70833 8.70833C8.70833 7.79167 9.625 7.33333 11 7.33333C12.375 7.33333 13.2917 7.79167 13.2917 8.70833C13.2917 9.625 12.375 10.0833 11 10.5417C9.625 11 8.70833 11.4583 8.70833 12.375C8.70833 13.2917 9.625 13.75 11 13.75C12.375 13.75 13.2917 13.2917 13.2917 12.375" />
    </svg>
  );
}
