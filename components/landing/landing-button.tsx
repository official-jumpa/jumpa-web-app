import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/cn";

const TONE = {
  primary: "bg-jumpa-primary-600",
  /** The FAQ's "Contact us", a step lighter than every other pill. */
  violet: "bg-jumpa-primary-525",
} as const;

/** Solid purple pill. Size and type come from the caller's `className`. */
export function LandingButton({
  href,
  tone = "primary",
  className,
  style,
  children,
}: {
  href: string;
  tone?: keyof typeof TONE;
  className?: string;
  /** Reveal stagger only (`revealStep`). */
  style?: CSSProperties;
  children: ReactNode;
}) {
  const classes = cn(
    "tap inline-flex items-center justify-center whitespace-nowrap rounded-full font-semibold text-jumpa-white active:scale-[0.98]",
    TONE[tone],
    className,
  );

  // `next/link` cannot carry a `mailto:` or an off-site URL.
  if (!href.startsWith("/") && !href.startsWith("#")) {
    return (
      <a href={href} className={classes} style={style}>
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={classes} style={style}>
      {children}
    </Link>
  );
}
