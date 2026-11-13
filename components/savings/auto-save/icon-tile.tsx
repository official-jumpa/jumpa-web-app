import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

const TONE = {
  /** A picked option, and the rhythm on the review card. */
  solid: "bg-[image:var(--gradient-jumpa-cta)] text-jumpa-white",
  /** A funding source or a schedule row. */
  soft: "bg-jumpa-primary-50 text-jumpa-primary-600",
  /** A rhythm that is not the picked one. */
  plain: "bg-jumpa-neutral-50 text-jumpa-neutral-450",
} as const;

const SIZE = {
  lg: "size-13 rounded-panel",
  md: "size-11.5 rounded-tab",
  sm: "size-9 rounded-tile",
} as const;

/** Rounded square behind an icon. The icon sets its own size. */
export function IconTile({
  tone,
  size,
  children,
}: {
  tone: keyof typeof TONE;
  size: keyof typeof SIZE;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center",
        SIZE[size],
        TONE[tone],
      )}
    >
      {children}
    </span>
  );
}
