import type { ReactNode } from "react";
import { JumpaLoader } from "@/components/ui/jumpa-loader";

/**
 * The compact Jumpa loader under the PIN sheet's box while its PIN is being
 * checked. It carries no caption; the sheet's title says what is happening.
 */
export function PinLoader({
  label,
  className = "",
}: {
  /** Announced to screen readers. */
  label: string;
  /** Spacing only. */
  className?: string;
}) {
  return (
    <div className={`flex animate-pop-in justify-center ${className}`}>
      <JumpaLoader label={label} className="size-12" markClassName="w-6" />
    </div>
  );
}

/**
 * A full PIN screen's loader, drawn over the note under the box while `busy`.
 * The note stays in flow, hidden, so the keypad below never moves; the loader
 * is one row so it fits inside the note's box.
 */
export function PinLoaderSlot({
  busy,
  label,
  children,
}: {
  busy: boolean;
  /** Shown beside the loader and announced to screen readers. */
  label: string;
  /** The note the loader stands in for. */
  children: ReactNode;
}) {
  return (
    <div className="relative">
      <div className={busy ? "invisible" : undefined}>{children}</div>
      {busy ? (
        <div className="absolute inset-0 flex animate-pop-in items-center justify-center gap-2.5">
          <JumpaLoader label={label} className="size-10" markClassName="w-5" />
          {/* Already announced by the loader's own live region. */}
          <p aria-hidden="true" className="text-xs text-jumpa-neutral-500">
            {label}
          </p>
        </div>
      ) : null}
    </div>
  );
}
