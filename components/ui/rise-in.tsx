import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Fades a block up into place, `index * 55ms` after the ones above it.
 *
 * A plain wrapper rather than a prop on each section, so nothing in the section
 * itself changes; it animates `opacity`/`transform` only, so no verified
 * geometry moves. Don't put a `fixed` child under one — the transform would
 * become its containing block for the length of the animation.
 */
export function RiseIn({
  index = 0,
  className,
  children,
}: {
  index?: number;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn("animate-rise stagger", className)}
      style={{ "--i": index } as CSSProperties}
    >
      {children}
    </div>
  );
}
