import { CalendarDaysIcon } from "@/components/ui/icons/calendar-days";
import { ChevronRightIcon } from "@/components/ui/icons/chevron-right";
import { ClockIcon } from "@/components/ui/icons/clock";
import { WalletOutlineIcon } from "@/components/ui/icons/wallet-outline";
import {
  AUTO_SAVE_INTERVALS,
  AUTO_SAVE_MONTH_DAYS,
  AUTO_SAVE_TIMES,
  AUTO_SAVE_WEEKDAYS,
  type AutoSaveDraft,
  cadenceCopy,
  formatAutoSaveAmount,
  type SourceBalances,
  sourceCaption,
  sourceCopy,
} from "@/lib/savings-auto-save";
import { CADENCE_ICON } from "./cadence-icon";
import { ConsentNote } from "./consent-note";
import { FlowScreen } from "./flow-screen";
import { IconTile } from "./icon-tile";
import { ROW, RowLabel } from "./row";
import { SchedulePicker, SECTION_LABEL } from "./schedule-picker";

/** Last screen: the rule read back, with the day and time it runs still open to change. */
export function ReviewStep({
  draft,
  balances,
  editing,
  onChange,
  onBack,
  onEditSource,
  onConfirm,
}: {
  draft: AutoSaveDraft;
  balances: SourceBalances;
  /** Changing a rule that already runs, rather than starting one. */
  editing: boolean;
  onChange: (changes: Partial<AutoSaveDraft>) => void;
  onBack: () => void;
  onEditSource: () => void;
  onConfirm: () => void;
}) {
  const copy = cadenceCopy(draft.cadence);
  const source = sourceCopy(draft.source);
  const CadenceIcon = CADENCE_ICON[draft.cadence];

  return (
    <FlowScreen
      onBack={onBack}
      title="Finish your setup"
      cta={{
        label: editing ? "Save changes" : "Start auto-saving",
        onClick: onConfirm,
      }}
    >
      <dl className="mt-5.25 flex h-18.5 items-center rounded-row bg-jumpa-primary-25 pr-6.5 pl-4 inset-ring-[1.5px] inset-ring-jumpa-grey-150">
        {/* Level with the text, which sits 2px under the card's centre. */}
        <span className="relative top-0.5">
          <IconTile size="sm" tone="solid">
            <CadenceIcon className="size-4.25" />
          </IconTile>
        </span>
        <div className="ml-4.5 flex w-30.25 flex-col">
          <dt className="text-sm leading-4.5 tracking-jumpa-snug text-jumpa-grey-500">
            How often
          </dt>
          <dd className="text-lg leading-5.5 font-semibold tracking-jumpa-snug text-jumpa-grey-950">
            {copy.name}
          </dd>
        </div>
        <span
          aria-hidden="true"
          className="h-10.5 w-0.5 rounded-full bg-jumpa-white"
        />
        <div className="flex flex-1 flex-col items-end">
          <dt className="text-sm leading-4.5 tracking-jumpa-snug text-jumpa-grey-500">
            Amount
          </dt>
          <dd className="text-lg leading-5.5 font-semibold tracking-jumpa-snug text-jumpa-primary-600">
            {formatAutoSaveAmount(draft.amount, draft.currency)}
          </dd>
        </div>
      </dl>

      <h2 className={`mt-4 ${SECTION_LABEL}`}>Pay with</h2>
      <button
        type="button"
        onClick={onEditSource}
        className={`tap mt-2.5 w-full text-left active:scale-[0.99] ${ROW}`}
      >
        <IconTile size="md" tone="soft">
          <WalletOutlineIcon className="size-5.5" />
        </IconTile>
        <RowLabel
          title={source.title}
          caption={sourceCaption(source, balances)}
        />
        <ChevronRightIcon className="size-5 shrink-0 text-jumpa-grey-400" />
      </button>

      {draft.cadence === "weekly" ? (
        <SchedulePicker
          label="Day of the week"
          icon={CalendarDaysIcon}
          value={String(draft.weekday)}
          options={AUTO_SAVE_WEEKDAYS}
          onChange={(day) => onChange({ weekday: Number(day) })}
        />
      ) : null}

      {draft.cadence === "monthly" ? (
        <SchedulePicker
          label="Day of the month"
          icon={CalendarDaysIcon}
          value={String(draft.monthDay)}
          options={AUTO_SAVE_MONTH_DAYS}
          onChange={(day) => onChange({ monthDay: Number(day) })}
        />
      ) : null}

      {/* A custom gap runs from when it is saved, so it has no time of day. */}
      {draft.cadence === "custom" ? (
        <SchedulePicker
          label="Repeat every"
          icon={ClockIcon}
          value={String(draft.intervalMinutes)}
          options={AUTO_SAVE_INTERVALS}
          onChange={(minutes) => onChange({ intervalMinutes: Number(minutes) })}
        />
      ) : (
        <SchedulePicker
          label="Preferred time"
          icon={ClockIcon}
          value={draft.time}
          options={AUTO_SAVE_TIMES}
          onChange={(time) => onChange({ time })}
        />
      )}

      <div className="mt-5 pb-2">
        <ConsentNote>
          {editing
            ? "Confirm these details? You can change them again anytime."
            : "Confirm these details? You can change them anytime before starting."}
        </ConsentNote>
      </div>
    </FlowScreen>
  );
}
