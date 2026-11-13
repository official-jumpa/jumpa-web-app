import { DetailList, DetailRow } from "@/components/transfer/detail-list";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import {
  type AutoSaveRule,
  formatAutoSaveAmount,
  scheduleLabel,
  sourceCopy,
  timeLabel,
} from "@/lib/savings-auto-save";

/** A running rule read back, with the two things left to do to it: change it or end it. */
export function AutoSaveSheet({
  planName,
  rule,
  onClose,
  onChange,
  onTurnOff,
}: {
  planName: string;
  rule: AutoSaveRule;
  onClose: () => void;
  onChange: () => void;
  onTurnOff: () => void;
}) {
  return (
    <BottomSheet onClose={onClose} pb="pb-7.5">
      <div className="flex flex-col gap-6 pt-2">
        <div className="flex flex-col items-center gap-2 text-center">
          <h2 className="text-2xl leading-6.5 font-medium text-jumpa-black">
            Auto-save
          </h2>
          <p className="max-w-72 text-xs leading-4 text-jumpa-neutral-500">
            {rule.paused
              ? `Paused. Nothing moves into ${planName} until you switch it back on.`
              : `Topping up ${planName} for you.`}
          </p>
        </div>

        <DetailList>
          <DetailRow
            label="Amount"
            value={formatAutoSaveAmount(rule.amount, rule.currency)}
          />
          <DetailRow label="How often" value={scheduleLabel(rule)} />
          <DetailRow label="Time" value={timeLabel(rule.time)} />
          <DetailRow
            label="Pay with"
            value={sourceCopy(rule.source).title}
            rule={false}
          />
        </DetailList>

        <div className="flex flex-col gap-2">
          <Button variant="gradientSheet" size="lg" onClick={onChange}>
            Change auto-save
          </Button>
          <Button variant="plain" size="sm" onClick={onTurnOff}>
            Turn off auto-save
          </Button>
        </div>
      </div>
    </BottomSheet>
  );
}
