import Link from "next/link";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

const RING =
  "tap flex h-15 w-full max-w-81.5 justify-center rounded-pill border border-jumpa-primary-300 bg-jumpa-white p-0.5 active:scale-[0.98]";
const FILL =
  "flex w-full items-center justify-center rounded-pill bg-[image:var(--gradient-jumpa-cta-ringed)] px-4 text-sm leading-4 font-bold text-jumpa-white";

/** Gradient CTA inside a white ring — the create-card and backup screens. */
export function RingedButton({
  href,
  children,
  ...rest
}: { children: ReactNode } & (
  | { href: string }
  | ({ href?: undefined } & ComponentPropsWithoutRef<"button">)
)) {
  if (href !== undefined) {
    return (
      <Link href={href} className={RING}>
        <span className={FILL}>{children}</span>
      </Link>
    );
  }

  return (
    <button type="button" className={RING} {...rest}>
      <span className={FILL}>{children}</span>
    </button>
  );
}
