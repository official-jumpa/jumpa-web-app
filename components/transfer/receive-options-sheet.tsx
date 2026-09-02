"use client";

import { ReceiveOptionList } from "@/components/transfer/receive-options";
import { SheetPortal } from "@/components/ui/sheet-portal";

/** Raised by Receive on the home hero. */
export function ReceiveOptionsSheet({ onClose }: { onClose: () => void }) {
  return (
    <SheetPortal onClose={onClose}>
      {/* pt-3 tops the handle's own mb-3 up to the design's 24px. */}
      <div className="flex flex-col items-center gap-4 pt-3">
        <h2 className="text-base leading-4.5 font-semibold text-jumpa-black">
          Add Money
        </h2>
        <ReceiveOptionList />
      </div>
    </SheetPortal>
  );
}
