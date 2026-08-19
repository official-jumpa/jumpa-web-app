import type { SVGProps } from "react";

export function PenLineIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <g transform="translate(2 2)">
        <path
          d="M13.4998 3.49677L16.3282 6.32519M11 18.9961H19M1.00001 18.9965L1.04746 18.6644C1.21537 17.489 1.29933 16.9013 1.4903 16.3526C1.65976 15.8658 1.89126 15.4028 2.17907 14.9751C2.50343 14.4931 2.9232 14.0733 3.76275 13.2338L15.4107 1.58579C16.1918 0.804739 17.4581 0.804737 18.2392 1.58579C19.0202 2.36683 19.0202 3.63316 18.2392 4.41421L6.37745 16.2759C5.61581 17.0376 5.23498 17.4184 4.80121 17.7213C4.41619 17.9901 4.00094 18.2128 3.56399 18.3848C3.07172 18.5785 2.54377 18.685 1.48794 18.8981L1.00001 18.9965Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}
