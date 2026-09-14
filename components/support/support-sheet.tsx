"use client";

import { SupportOptionList } from "@/components/support/support-options";
import { SheetPortal } from "@/components/ui/sheet-portal";

/** Help & Support, raised from the home header. The frame draws no title. */
export function SupportSheet({ onClose }: { onClose: () => void }) {
  return (
    <SheetPortal onClose={onClose}>
      <div className="flex flex-col items-center pt-3">
        <h2 className="sr-only">Help and support</h2>
        <SupportOptionList />
      </div>
    </SheetPortal>
  );
}
