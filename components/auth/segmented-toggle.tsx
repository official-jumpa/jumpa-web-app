import { cn } from "@/lib/cn";

/** Pill switch — "12 WORDS" / "24 WORDS". */
export function SegmentedToggle<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex gap-1 rounded-pill bg-jumpa-neutral-50 p-1">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              "rounded-pill px-2.5 py-2 text-[10px] leading-3 font-medium",
              selected
                ? "bg-jumpa-primary-600 text-jumpa-alt-400"
                : "text-jumpa-primary-950",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
