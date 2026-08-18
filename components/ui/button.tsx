import Link from "next/link";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Pill button. Fixed 52px height from the design, so bordered variants match unbordered ones. */
const VARIANTS = {
  light: "bg-jumpa-white text-jumpa-primary-600 font-semibold",
  brand: "bg-jumpa-primary-600 text-jumpa-white font-semibold",
  ghost:
    "bg-white/17 border border-white/27 text-jumpa-white font-medium backdrop-blur-sm",
  ghostOnImage:
    "bg-white/22 border border-white/27 text-jumpa-white font-medium backdrop-blur-sm",
} as const;

export type ButtonVariant = keyof typeof VARIANTS;

const BASE =
  "flex h-[52px] w-full items-center justify-center rounded-pill px-2.5 text-base leading-4 " +
  "transition-[transform,opacity] duration-150 active:scale-[0.98] " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jumpa-alt-400";

type BaseProps = {
  variant?: ButtonVariant;
  className?: string;
  children: ReactNode;
};

type ButtonAsLink = BaseProps & { href: string };
type ButtonAsButton = BaseProps &
  ComponentPropsWithoutRef<"button"> & { href?: undefined };

export function Button(props: ButtonAsLink): ReactNode;
export function Button(props: ButtonAsButton): ReactNode;
export function Button({
  variant = "light",
  className,
  children,
  ...rest
}: ButtonAsLink | ButtonAsButton) {
  const classes = cn(BASE, VARIANTS[variant], className);

  if ("href" in rest && rest.href !== undefined) {
    const { href, ...linkRest } = rest;
    return (
      <Link href={href} className={classes} {...linkRest}>
        {children}
      </Link>
    );
  }

  const { href: _ignored, ...buttonRest } = rest as ButtonAsButton;
  return (
    <button type="button" className={classes} {...buttonRest}>
      {children}
    </button>
  );
}
