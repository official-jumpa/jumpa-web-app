import { ClockIcon } from "@/components/ui/icons/clock";
import { SparkIcon } from "@/components/ui/icons/spark";
import {
  AUTO_SAVE_CADENCES,
  AUTO_SAVE_INTERVALS,
  type AutoSaveCadence,
} from "@/lib/savings-auto-save";
import { CADENCE_ICON } from "./cadence-icon";
import { ChoiceCard } from "./choice-card";
import { SchedulePicker } from "./schedule-picker";
import { StepScreen } from "./step-screen";

/** Step 1: how often money moves. */
export function RhythmStep({
  cadence,
  intervalMinutes,
  onChange,
  onIntervalChange,
  onBack,
  onContinue,
}: {
  cadence: AutoSaveCadence;
  /** Gap a custom rhythm repeats on. */
  intervalMinutes: number;
  onChange: (cadence: AutoSaveCadence) => void;
  onIntervalChange: (minutes: number) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  return (
    <StepScreen
      step={1}
      title="Put your savings on autopilot"
      caption="Choose a rhythm and Jumpa quietly tucks money away for you. No reminders, no willpower."
      onBack={onBack}
      cta={{ label: "Continue", onClick: onContinue }}
    >
      <div className="mt-5 flex flex-col gap-3">
        {AUTO_SAVE_CADENCES.map((option) => (
          <ChoiceCard
            key={option.value}
            look="rhythm"
            icon={CADENCE_ICON[option.value]}
            title={option.title}
            caption={option.caption}
            selected={option.value === cadence}
            onSelect={() => onChange(option.value)}
          />
        ))}
      </div>

      {cadence === "custom" ? (
        <SchedulePicker
          label="Repeat every"
          icon={ClockIcon}
          value={String(intervalMinutes)}
          options={AUTO_SAVE_INTERVALS}
          onChange={(minutes) => onIntervalChange(Number(minutes))}
        />
      ) : null}

      <p className="mt-5 flex min-h-11.25 items-center gap-2.5 rounded-panel bg-jumpa-neutral-55 px-3.5 py-3 text-xs leading-3.5 text-jumpa-grey-500">
        <SparkIcon className="size-4.5 shrink-0 text-jumpa-primary-600" />
        Change or pause this any time from your plan.
      </p>
    </StepScreen>
  );
}
