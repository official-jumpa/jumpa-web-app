import { cn } from "@/lib/cn";

/** Compact switch inside a track — "12 WORDS" / "24 WORDS". */
const CHIP = {
  track: "inline-flex gap-1 rounded-pill bg-jumpa-neutral-50 p-1",
  option:
    "flex items-center justify-center gap-1 rounded-pill px-2.5 py-2 text-[10px] leading-3 font-medium",
  on: "bg-jumpa-primary-600 text-jumpa-alt-400",
  off: "text-jumpa-primary-950",
} as const;

/** Two full-width pills side by side — the bank/mobile-money destination. */
const SPLIT = {
  track: "flex gap-4",
  option:
    "flex h-11.5 flex-1 items-center justify-center gap-1.5 rounded-pill text-sm leading-4 font-medium",
  on: "bg-jumpa-primary-600 text-jumpa-white",
  off: "bg-jumpa-primary-50 text-jumpa-primary-950",
} as const;

const VARIANTS = { chip: CHIP, split: SPLIT } as const;

/**
 * Not-yet-live tone, shared by both variants: the pill stays in place so the
 * row keeps its shape, and the label softens behind a "Soon" tag rather than
 * disappearing. The blur is what says "unavailable" at a glance.
 */
const MUTED = "cursor-not-allowed bg-jumpa-neutral-50 text-jumpa-neutral-300";
const MUTED_LABEL = "opacity-70 blur-[0.6px]";
const SOON =
  "rounded-pill bg-jumpa-neutral-95 px-1.5 py-0.5 text-[9px] leading-3 font-semibold tracking-jumpa-wide text-jumpa-neutral-400 uppercase";

export function SegmentedToggle<T extends string>({
  options,
  value,
  onChange,
  variant = "chip",
}: {
  options: readonly { value: T; label: string; disabled?: boolean }[];
  value: T;
  onChange: (value: T) => void;
  variant?: keyof typeof VARIANTS;
}) {
  const style = VARIANTS[variant];

  return (
    <div className={style.track}>
      {options.map((option) => {
        const selected = option.value === value;
        const tone = option.disabled
          ? MUTED
          : selected
            ? style.on
            : style.off;
        return (
          <button
            key={option.value}
            type="button"
            disabled={option.disabled}
            aria-pressed={selected}
            onClick={() => onChange(option.value)}
            className={cn("tap", style.option, tone)}
          >
            <span className={option.disabled ? MUTED_LABEL : undefined}>
              {option.label}
            </span>
            {option.disabled ? <span className={SOON}>Soon</span> : null}
          </button>
        );
      })}
    </div>
  );
}
