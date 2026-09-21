import Link from "next/link";
import type { ComponentPropsWithoutRef, CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * The purple "Join Private Beta" pill. Size comes from the caller's `pill-u-*`
 * class (see `globals.css`), so the same component draws the 16px nav pill and
 * the 23.5px feature-panel one. Renders a link when `href` is given.
 */
type BaseProps = {
  className: string;
  children: ReactNode;
  /** Only for the reveal's `--i`; the pill takes no inline geometry. */
  style?: CSSProperties;
};
type AsLink = BaseProps & { href: string };
type AsButton = BaseProps &
  ComponentPropsWithoutRef<"button"> & { href?: undefined };

const PILL =
  "tap inline-flex shrink-0 items-center justify-center rounded-full bg-jumpa-primary-600 font-medium tracking-jumpa whitespace-nowrap text-jumpa-white active:scale-[0.98]";

export function CtaPill(props: AsLink): ReactNode;
export function CtaPill(props: AsButton): ReactNode;
export function CtaPill({
  className,
  children,
  style,
  ...rest
}: AsLink | AsButton) {
  const classes = cn(PILL, className);

  if (rest.href !== undefined) {
    return (
      <Link prefetch href={rest.href} className={classes} style={style}>
        {children}
      </Link>
    );
  }

  const { href: _href, ...buttonRest } = rest;
  return (
    <button type="button" className={classes} style={style} {...buttonRest}>
      {children}
    </button>
  );
}
