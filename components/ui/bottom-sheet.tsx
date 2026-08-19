import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Dimmed overlay with a panel on the bottom edge. Tapping the backdrop closes
 * it; the grab handle is decorative, as the design shows no drag affordance.
 */
export function BottomSheet({
  onClose,
  className,
  children,
}: {
  onClose: () => void;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-30 mx-auto max-w-[430px]">
      <button
        type="button"
        aria-label="Dismiss"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-jumpa-black/45"
      />

      <div
        className={cn(
          "absolute inset-x-2.5 bottom-[calc(env(safe-area-inset-bottom)+10px)] rounded-sheet bg-jumpa-white px-6 pt-3 pb-6",
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
