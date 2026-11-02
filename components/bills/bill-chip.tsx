import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Amount and period pills on the bill screens; the selected one turns solid purple. */
export function BillChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "tap shrink-0 rounded-pill px-4 py-2.5 text-sm leading-none font-medium tracking-jumpa-snug whitespace-nowrap active:scale-95",
        active
          ? "bg-jumpa-primary-600 text-jumpa-white"
          : "bg-jumpa-neutral-50 text-jumpa-ink",
      )}
    >
      {children}
    </button>
  );
}
