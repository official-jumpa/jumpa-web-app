import type { SVGProps } from "react";

/** The nav's active avatar. `circle-user` is the stroked cut it rests at. */
export function CircleUserSolidIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2ZM15 10C15 11.6569 13.6569 13 12 13C10.3431 13 9 11.6569 9 10C9 8.34315 10.3431 7 12 7C13.6569 7 15 8.34315 15 10ZM17.5633 17.7488C16.6729 15.5506 14.5175 14 11.9999 14C9.48232 14 7.3269 15.5506 6.43652 17.7488C7.87626 19.1424 9.83793 20 11.9999 20C14.1619 20 16.1236 19.1424 17.5633 17.7488Z"
        fill="currentColor"
      />
    </svg>
  );
}
