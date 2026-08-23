import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Dimmed overlay with a bottom panel. The grab handle is decorative — no drag in the design. */
export function BottomSheet({
  onClose,
  pb = "pb-6",
  className,
  children,
}: {
  onClose: () => void;
  /** Bottom padding, as its own slot — `cn` is a plain join, so a `pb-*` in
   *  `className` would not reliably beat the default. */
  pb?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-30 mx-auto max-w-app">
      <button
        type="button"
        aria-label="Dismiss"
        onClick={onClose}
        className="absolute inset-0 animate-fade cursor-default bg-jumpa-black/45"
      />

      <div
        className={cn(
          "absolute inset-x-2.5 bottom-[calc(env(safe-area-inset-bottom)+10px)] animate-sheet-up rounded-sheet bg-jumpa-white px-6 pt-3",
          pb,
          className,
        )}
      >
        <span
          aria-hidden="true"
          className="mx-auto mb-4 block h-1 w-25 rounded-full bg-jumpa-neutral-75"
        />
        {children}
      </div>
    </div>
  );
}
