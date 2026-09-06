"use client";

import { Button } from "@/components/ui/button";
import { TriangleWarningIcon } from "@/components/ui/icons/triangle-warning";
import { SheetPortal } from "@/components/ui/sheet-portal";

/**
 * A failed action, in place of the browser alert the flows used to raise.
 * Copy comes from the caller already translated out of provider-speak.
 *
 * On `SheetPortal`, not `BottomSheet`: the transfer and savings screens set
 * their own stacking contexts, so a sheet rendered in place paints under them.
 */
export function ResultSheet({
  title,
  message,
  retryLabel = "Try again",
  onRetry,
  onClose,
}: {
  title: string;
  message: string;
  retryLabel?: string;
  /** Omitted when trying again cannot help — the sheet then only closes. */
  onRetry?: () => void;
  onClose: () => void;
}) {
  return (
    <SheetPortal onClose={onClose} className="px-6 pb-7.5">
      <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-jumpa-danger-50 text-jumpa-danger">
        <TriangleWarningIcon className="size-8" />
      </span>

      <h2 className="mt-4 text-center text-xl leading-6 font-bold text-jumpa-black">
        {title}
      </h2>

      <p className="mt-3 text-center text-sm leading-5 text-jumpa-neutral-700">
        {message}
      </p>

      {onRetry ? (
        <Button
          variant="gradientSheet"
          size="lg"
          className="mt-6"
          onClick={onRetry}
        >
          {retryLabel}
        </Button>
      ) : null}

      <Button
        size="lg"
        className={onRetry ? "mt-2 font-semibold" : "mt-6 font-semibold"}
        onClick={onClose}
      >
        Close
      </Button>
    </SheetPortal>
  );
}
