"use client";

import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { TriangleWarningIcon } from "@/components/ui/icons/triangle-warning";

export function LeaveConfirmSheet({
  onKeepGoing,
  onLeave,
}: {
  onKeepGoing: () => void;
  onLeave: () => void;
}) {
  return (
    <BottomSheet onClose={onKeepGoing} pb="pb-7.5">
      <div className="flex flex-col items-center text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-amber-50 text-amber-500">
          <TriangleWarningIcon className="size-7" />
        </div>

        <h2 className="mt-4 text-lg leading-6 font-bold text-jumpa-black">
          Leave verification?
        </h2>

        <p className="mt-2 text-xs leading-5 text-jumpa-neutral-500 max-w-[280px]">
          You&apos;re making great progress! If you leave now, your progress will be cleared, and you will need to restart from
          scratch.
        </p>

        <div className="mt-6 flex w-full flex-col gap-2.5">
          <Button variant="gradient" size="lg" onClick={onKeepGoing}>
            Continue Verification
          </Button>

          <button
            type="button"
            onClick={onLeave}
            className="tap flex h-11 w-full items-center justify-center rounded-pill text-xs font-semibold text-jumpa-danger hover:bg-jumpa-danger-50/50 active:scale-98 transition-colors"
          >
            Leave and start over
          </button>
        </div>
      </div>
    </BottomSheet>
  );
}
