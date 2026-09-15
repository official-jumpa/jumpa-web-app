import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * The small eyebrow pill above every section heading. Every measurement is in
 * `em`, so the caller's `text-u-*` font-size class sizes the whole badge; the
 * design draws each one as a uniformly scaled instance of the same component.
 */
const VARIANTS = {
  /** White pill, hairline border, bare glyph — hero, How it works, the beta CTA. */
  outline: {
    pill: "gap-[0.571em] border-[0.0714em] border-jumpa-neutral-150 bg-jumpa-white py-[0.5em] pr-[1em] pl-[0.714em] leading-[1.143em] text-jumpa-black",
    icon: "size-[1.714em] text-jumpa-primary-600 *:size-full",
  },
  /** Tinted pill with the glyph on a purple disc — Features, Why Jumpa, FAQ. */
  disc: {
    pill: "gap-[0.5em] border-[0.0625em] border-jumpa-primary-100 bg-jumpa-primary-50 py-[0.25em] pr-[1.375em] pl-[0.25em] leading-none text-jumpa-primary-950",
    icon: "flex size-[2.375em] items-center justify-center rounded-full bg-jumpa-primary-600 text-jumpa-alt-400 *:size-[1.39em]",
  },
  /** The disc badge on white with purple text — Security. */
  discWhite: {
    pill: "gap-[0.5em] border-[0.0625em] border-jumpa-primary-100 bg-jumpa-white py-[0.25em] pr-[1.375em] pl-[0.25em] leading-none text-jumpa-primary-600",
    icon: "flex size-[2.375em] items-center justify-center rounded-full bg-jumpa-primary-600 text-jumpa-alt-400 *:size-[1.39em]",
  },
} as const;

type SectionBadgeProps = {
  variant: keyof typeof VARIANTS;
  icon: ReactNode;
  /** Must carry the `text-u-*` size; everything inside scales from it. */
  className: string;
  children: ReactNode;
};

export function SectionBadge({
  variant,
  icon,
  className,
  children,
}: SectionBadgeProps) {
  const styles = VARIANTS[variant];
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full font-medium tracking-jumpa whitespace-nowrap",
        styles.pill,
        className,
      )}
    >
      <span className={cn("shrink-0", styles.icon)}>{icon}</span>
      <span>{children}</span>
    </span>
  );
}
