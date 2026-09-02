"use client";

import type { ReactNode } from "react";
import { CloseButton } from "@/components/transfer/close-button";
import { Button } from "@/components/ui/button";
import { SheetPortal } from "@/components/ui/sheet-portal";

/**
 * Confirmation sheet shared by every transfer. `summary` is the row under the
 * title (who it is going to), `children` the boxed detail list.
 */
export function ReviewSheet({
  title = "Review",
  summary,
  headline,
  headlineLabel = "RECIPIENT GETS",
  confirmLabel,
  onConfirm,
  onClose,
  children,
}: {
  title?: string;
  summary: ReactNode;
  headline: string;
  headlineLabel?: string;
  confirmLabel: string;
  onConfirm: () => void;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <SheetPortal onClose={onClose}>
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg leading-normal font-medium text-jumpa-black">
            {title}
          </h2>
          <CloseButton onClick={onClose} label="Close review" size="sm" />
        </div>

        {summary}

        <span className="-mb-px block h-px w-full bg-jumpa-neutral-100" />

        <div className="flex flex-col gap-2">
          <p className="text-[10px] leading-2.5 text-jumpa-black/50">
            {headlineLabel}
          </p>
          <p className="text-[32px] leading-none font-medium text-jumpa-black">
            {headline}
          </p>
        </div>

        <span className="-mb-px block h-px w-full bg-jumpa-neutral-100" />

        {children}
      </div>

      <Button variant="gradient" size="lg" className="mt-6" onClick={onConfirm}>
        {confirmLabel}
      </Button>
    </SheetPortal>
  );
}
