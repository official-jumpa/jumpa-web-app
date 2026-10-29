import Link from "next/link";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Pill button. Heights are explicit so bordered variants match unbordered ones. */
const VARIANTS = {
  light: "bg-jumpa-white text-jumpa-primary-600 font-semibold",
  brand: "bg-jumpa-primary-600 text-jumpa-white font-semibold",
  ghost:
    "bg-white/17 border border-white/27 text-jumpa-white font-medium backdrop-blur-sm",
  ghostOnImage:
    "bg-white/22 border border-white/27 text-jumpa-white font-medium backdrop-blur-sm",
  /** Primary action on the light auth screens. */
  gradient:
    "bg-[image:var(--gradient-jumpa-cta)] text-jumpa-alt-400 font-semibold",
  /** Same gradient inside a bottom sheet, where the label is near-white. */
  gradientSheet:
    "bg-[image:var(--gradient-jumpa-cta)] text-jumpa-alt-50 font-medium",
  /** Same shape, waiting on the user. */
  soft: "bg-jumpa-primary-50 text-jumpa-primary-400 font-semibold",
  /** Tinted secondary action that is available, e.g. "i'll do this later". */
  softStrong: "bg-jumpa-primary-50 text-jumpa-primary-950 font-bold",
  /** Purple label on a deeper tint, before a form has what it needs. */
  softBrand: "bg-jumpa-primary-100 text-jumpa-primary-600 font-semibold",
  /** Solid purple with the lime label — Edit Profile, KYC tiers. */
  brandAccent: "bg-jumpa-primary-600 text-jumpa-alt-400 font-semibold",
  /** Quiet second action under a CTA — purple label, no shape of its own. */
  plain: "text-jumpa-primary-525 font-medium",
  /** Bordered second action — "Keep my account". */
  outline:
    "border border-jumpa-lavender-275 text-jumpa-primary-950 font-semibold",
  /** Same border with the purple label — the delete confirmation's last step. */
  outlineBrand:
    "border border-jumpa-lavender-275 text-jumpa-primary-600 font-semibold",
  /** Irreversible action — deleting an account. */
  danger:
    "bg-jumpa-danger text-jumpa-white font-semibold disabled:bg-jumpa-danger/35",
} as const;

const SIZES = {
  sm: "h-11 text-base", // referrals
  md: "h-[52px] text-base", // onboarding
  lg: "h-14 text-base", // auth screens
  cta: "h-13.5 text-sm tracking-jumpa-snug", // delete account
  sheet: "h-13.5 text-base tracking-jumpa-snug", // profile photo sheet
} as const;

export type ButtonVariant = keyof typeof VARIANTS;
export type ButtonSize = keyof typeof SIZES;

const BASE =
  "flex w-full items-center justify-center rounded-pill px-2.5 leading-4 " +
  "tap active:scale-[0.98] " +
  "disabled:pointer-events-none " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jumpa-alt-400";

type BaseProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children: ReactNode;
};

type ButtonAsLink = BaseProps &
  Omit<ComponentPropsWithoutRef<typeof Link>, keyof BaseProps> & { href: string };
type ButtonAsButton = BaseProps &
  Omit<ComponentPropsWithoutRef<"button">, keyof BaseProps> & { href?: undefined };

export function Button(props: ButtonAsLink): ReactNode;
export function Button(props: ButtonAsButton): ReactNode;
export function Button({
  variant = "light",
  size = "md",
  className,
  children,
  ...rest
}: ButtonAsLink | ButtonAsButton) {
  const classes = cn(BASE, SIZES[size], VARIANTS[variant], className);

  if ("href" in rest && rest.href !== undefined) {
    const { href, ...linkRest } = rest;
    return (
      <Link prefetch href={href} className={classes} {...linkRest}>
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
