import { cn } from "@/lib/cn";

/** Muted, not recoloured — anything not live yet keeps its own colours so it still reads as itself. */
export const SOON = "opacity-50 blur-[0.4px] cursor-not-allowed select-none";

/** Corner tag on anything not live yet. `className` only places it. */
export function SoonTag({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute z-10 rounded-pill bg-jumpa-neutral-95 px-1 py-px text-[6px] leading-2 font-semibold tracking-jumpa-wide text-jumpa-neutral-450 uppercase",
        className,
      )}
    >
      Soon
    </span>
  );
}
