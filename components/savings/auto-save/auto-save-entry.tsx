import { useState } from "react";
import { Toggle } from "@/components/settings/toggle";
import { ZapIcon } from "@/components/ui/icons/zap";
import { SOON, SoonTag } from "@/components/ui/soon-tag";
import { cn } from "@/lib/cn";
import {
  type AutoSaveRule,
  autoSaveAvailability,
  formatAutoSaveAmount,
  roomLeft,
  ruleSummary,
  scheduleLabel,
} from "@/lib/savings-auto-save";
import type { SavingsGoal } from "@/lib/savings-hub";
import { AutoSaveSheet } from "./auto-save-sheet";
import { IconTile } from "./icon-tile";
import { ROW, RowLabel } from "./row";
import { TurnOffSheet } from "./turn-off-sheet";

/**
 * Auto-save on a plan's own page. The row opens setup until a rule exists;
 * after that it opens the rule, and the switch pauses or resumes it.
 */
export function AutoSaveEntry({
  goal,
  rule,
  onSetUp,
  onPause,
  onTurnOff,
}: {
  goal: SavingsGoal;
  rule?: AutoSaveRule;
  /** Opens the flow, for a first rule or to change the current one. */
  onSetUp: () => void;
  onPause: (paused: boolean) => void;
  onTurnOff: () => void;
}) {
  const [managing, setManaging] = useState(false);
  const [confirmingOff, setConfirmingOff] = useState(false);
  const availability = autoSaveAvailability(goal);
  const running = Boolean(rule) && !rule?.paused;

  if (availability === "none") return null;
  // A full plan has nothing left to save towards.
  if (!rule && availability === "ready" && roomLeft(goal) === 0) return null;

  const caption = rule
    ? rule.paused
      ? `Paused · ${formatAutoSaveAmount(rule.amount, rule.currency)} · ${scheduleLabel(rule)}`
      : ruleSummary(rule)
    : availability === "soon"
      ? `Not available for ${goal.currency} plans yet`
      : "Top up this plan on a schedule";

  const body = (
    <>
      <IconTile size="md" tone={running ? "solid" : "soft"}>
        <ZapIcon className="size-5.5" />
      </IconTile>
      <RowLabel title="Auto-save" caption={caption} />
    </>
  );

  if (availability === "soon") {
    return (
      <div className="relative">
        <div aria-disabled="true" className={cn(ROW, SOON)}>
          <span className="flex min-w-0 flex-1 items-center gap-3.5">
            {body}
          </span>
          <Toggle label="Auto-save (coming soon)" checked={false} disabled />
        </div>
        <SoonTag className="top-1.5 left-10.5" />
      </div>
    );
  }

  return (
    <>
      <div className={ROW}>
        <button
          type="button"
          onClick={rule ? () => setManaging(true) : onSetUp}
          className="tap flex min-w-0 flex-1 items-center gap-3.5 self-stretch text-left active:scale-[0.99]"
        >
          {body}
        </button>
        <Toggle
          label={running ? "Pause auto-save" : "Turn on auto-save"}
          checked={running}
          onChange={(on) => (rule ? onPause(!on) : onSetUp())}
        />
      </div>

      {managing && rule ? (
        <AutoSaveSheet
          planName={goal.name}
          rule={rule}
          onClose={() => setManaging(false)}
          onChange={() => {
            setManaging(false);
            onSetUp();
          }}
          onTurnOff={() => {
            setManaging(false);
            setConfirmingOff(true);
          }}
        />
      ) : null}

      {confirmingOff && rule ? (
        <TurnOffSheet
          planName={goal.name}
          // Backing out returns to the rule it was raised from.
          onKeep={() => {
            setConfirmingOff(false);
            setManaging(true);
          }}
          onTurnOff={() => {
            setConfirmingOff(false);
            onTurnOff();
          }}
        />
      ) : null}
    </>
  );
}
