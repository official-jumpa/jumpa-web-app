import { cn } from "@/lib/cn";

/** Compact switch inside a track — "12 WORDS" / "24 WORDS". */
const CHIP = {
  track: "inline-flex gap-1 rounded-pill bg-jumpa-neutral-50 p-1",
  option: "rounded-pill px-2.5 py-2 text-[10px] leading-3 font-medium",
  on: "bg-jumpa-primary-600 text-jumpa-alt-400",
  off: "text-jumpa-primary-950",
} as const;

/** Two full-width pills side by side — the bank/mobile-money destination. */
const SPLIT = {
  track: "flex gap-4",
  option: "h-11.5 flex-1 rounded-pill text-sm leading-4 font-medium",
  on: "bg-jumpa-primary-600 text-jumpa-white",
  off: "bg-jumpa-primary-50 text-jumpa-primary-950",
} as const;

const VARIANTS = { chip: CHIP, split: SPLIT } as const;

export function SegmentedToggle<T extends string>({
  options,
  value,
  onChange,
  variant = "chip",
}: {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  variant?: keyof typeof VARIANTS;
}) {
  const style = VARIANTS[variant];

  return (
    <div className={style.track}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(option.value)}
            className={cn("tap", style.option, selected ? style.on : style.off)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
