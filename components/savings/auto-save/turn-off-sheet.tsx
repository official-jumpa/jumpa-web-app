import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";

/** Raised before a plan's auto-save is cleared, so ending it takes a second tap. */
export function TurnOffSheet({
  planName,
  onKeep,
  onTurnOff,
}: {
  planName: string;
  onKeep: () => void;
  onTurnOff: () => void;
}) {
  return (
    <BottomSheet onClose={onKeep} pb="pb-7.5">
      <div className="flex flex-col gap-6 pt-2">
        <div className="flex flex-col items-center gap-2 text-center">
          <h2 className="text-2xl leading-6.5 font-medium text-jumpa-black">
            Turn off auto-save?
          </h2>
          <p className="max-w-72 text-xs leading-4 text-jumpa-neutral-500">
            {`This clears the schedule for ${planName}. Money already saved stays in the plan. Just need a break? Pause it with the switch instead.`}
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Button variant="gradientSheet" size="lg" onClick={onKeep}>
            Keep auto-save
          </Button>
          <Button variant="plain" size="sm" onClick={onTurnOff}>
            Yes, turn off
          </Button>
        </div>
      </div>
    </BottomSheet>
  );
}
