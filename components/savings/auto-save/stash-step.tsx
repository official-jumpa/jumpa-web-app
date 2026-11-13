import { NumericKeypad } from "@/components/auth/numeric-keypad";
import { SparkIcon } from "@/components/ui/icons/spark";
import { SegmentedToggle } from "@/components/ui/segmented-toggle";
import { useKeypadKeys } from "@/hooks/use-keypad-keys";
import { cn } from "@/lib/cn";
import {
  AUTO_SAVE_CURRENCIES,
  type AutoSaveCadence,
  amountError,
  cadenceCopy,
  formatAutoSaveAmount,
  formatWhole,
  projectionLabel,
  repeatLabel,
} from "@/lib/savings-auto-save";
import {
  currencySymbol,
  type SavingsCurrency,
  type SavingsGoal,
} from "@/lib/savings-hub";
import { StepScreen } from "./step-screen";

const CURRENCY_OPTIONS = (
  Object.keys(AUTO_SAVE_CURRENCIES) as SavingsCurrency[]
).map((currency) => ({
  value: currency,
  label: `${currencySymbol(currency)} ${AUTO_SAVE_CURRENCIES[currency].label}`,
  disabled: !AUTO_SAVE_CURRENCIES[currency].live,
}));

const INSIGHT =
  "flex w-full items-center justify-center gap-2 rounded-panel px-3.5 py-2.5 text-center text-xs leading-4 font-medium";

/** Step 2: how much moves each time, typed on the pad or picked from the shortcuts. */
export function StashStep({
  goal,
  cadence,
  intervalMinutes,
  amount,
  onChange,
  onBack,
  onContinue,
}: {
  goal: SavingsGoal;
  cadence: AutoSaveCadence;
  intervalMinutes: number;
  amount: number;
  onChange: (amount: number) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  const { currency } = goal;
  const copy = cadenceCopy(cadence);
  const rhythm = { cadence, intervalMinutes };
  const rules = AUTO_SAVE_CURRENCIES[currency];
  const error = amountError(amount, goal);
  const digits = amount ? String(amount) : "";

  // Whole amounts only, and never longer than the ceiling itself.
  const set = (next: string) =>
    onChange(
      Number(next.replace(/\D/g, "").slice(0, String(rules.cap).length)),
    );
  const push = (digit: string) => set(digits + digit);
  const backspace = () => set(digits.slice(0, -1));
  useKeypadKeys({ push, backspace, set });

  return (
    <StepScreen
      step={2}
      title={`Set your ${copy.name.toLowerCase()} stash`}
      caption={`How much should land in savings each ${copy.unit}?`}
      onBack={onBack}
      cta={{
        label: "Continue",
        onClick: onContinue,
        ready: amount > 0 && !error,
      }}
    >
      <div className="mt-3.75">
        {/* A plan saves in one currency, so the switch only shows which. */}
        <SegmentedToggle
          variant="well"
          options={CURRENCY_OPTIONS}
          value={currency}
          onChange={() => {}}
        />
      </div>

      <div className="mt-5.25 flex flex-col items-center gap-0.5">
        <p className="flex h-15.5 items-center gap-1.5 font-semibold">
          <span className="sr-only">
            {formatAutoSaveAmount(amount, currency)}
          </span>
          <span
            aria-hidden="true"
            className="text-[38px] leading-none text-jumpa-primary-600"
          >
            {currencySymbol(currency)}
          </span>
          <span
            aria-hidden="true"
            className={cn(
              "text-5xl leading-none tracking-jumpa-snug",
              error
                ? "text-jumpa-danger-400"
                : amount
                  ? "text-jumpa-grey-950"
                  : "text-jumpa-grey-400",
            )}
          >
            {formatWhole(amount)}
          </span>
          <span
            aria-hidden="true"
            className="h-13 w-0.75 animate-caret rounded-full bg-jumpa-primary-600"
          />
        </p>
        <p className="text-sm leading-4.5 font-medium tracking-jumpa-snug text-jumpa-grey-400">
          {repeatLabel(rhythm).toLowerCase()}
        </p>
      </div>

      <div className="mt-5.25 flex gap-2">
        {rules.quickAmounts[cadence].map((quick) => (
          <button
            key={quick}
            type="button"
            aria-pressed={quick === amount}
            onClick={() => onChange(quick)}
            className={cn(
              "tap flex h-10 flex-1 items-center justify-center rounded-pill text-sm leading-4 font-semibold tracking-jumpa-snug active:scale-95",
              quick === amount
                ? "bg-jumpa-primary-600 text-jumpa-white"
                : "bg-jumpa-neutral-50 text-jumpa-primary-950",
            )}
          >
            {formatAutoSaveAmount(quick, currency)}
          </button>
        ))}
      </div>

      {/* Holds its height while empty so the pad never jumps. */}
      <div aria-live="polite" className="mt-4 flex min-h-9">
        {error ? (
          <p className={cn(INSIGHT, "bg-jumpa-danger-50 text-jumpa-danger")}>
            {error}
          </p>
        ) : amount > 0 ? (
          <p
            className={cn(
              INSIGHT,
              "bg-jumpa-neutral-50 text-jumpa-primary-950",
            )}
          >
            <SparkIcon className="size-4 shrink-0 text-jumpa-primary-600" />
            {projectionLabel(amount, rhythm, currency)}
          </p>
        ) : null}
      </div>

      <NumericKeypad
        size="sm"
        onDigit={push}
        onBackspace={backspace}
        className="mt-4.5"
      />
    </StepScreen>
  );
}
