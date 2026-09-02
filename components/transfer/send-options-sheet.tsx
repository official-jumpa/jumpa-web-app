"use client";

import { CloseButton } from "@/components/transfer/close-button";
import { SendOptionList } from "@/components/transfer/send-options";
import { SheetPortal } from "@/components/ui/sheet-portal";

/** Raised by Send on the home hero. */
export function SendOptionsSheet({ onClose }: { onClose: () => void }) {
  return (
    <SheetPortal onClose={onClose}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg leading-normal font-medium text-jumpa-black">
          How do you want to send?
        </h2>
        <CloseButton onClick={onClose} label="Close" size="sm" />
      </div>

      <div className="mt-3">
        <SendOptionList />
      </div>
    </SheetPortal>
  );
}
