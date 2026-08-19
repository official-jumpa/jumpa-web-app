import Link from "next/link";
import type { ReactNode } from "react";

/** Gradient CTA inside a white ring. The only one, so it stays out of `Button`. */
export function RingedButton({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex h-15 w-full max-w-81.5 justify-center rounded-pill border border-jumpa-primary-300 bg-jumpa-white p-0.5 transition-transform duration-150 active:scale-[0.98]"
    >
      <span className="flex w-full items-center justify-center rounded-pill bg-[image:var(--gradient-jumpa-cta-ringed)] px-4 text-sm leading-4 font-bold text-jumpa-white">
        {children}
      </span>
    </Link>
  );
}
