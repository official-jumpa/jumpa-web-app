"use client";

/** Pill row used for lock terms, target terms and goal categories. */
export function ChoiceChips({
  options,
  value,
  onChange,
}: {
  options: readonly string[];
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const active = option === value;
        return (
          <button
            key={option}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option)}
            className={`tap flex h-9 min-w-0 flex-1 items-center justify-center rounded-pill px-2 text-xs leading-4 font-medium active:scale-95 ${
              active
                ? "bg-jumpa-primary-600 text-jumpa-primary-50"
                : "border-[1.32px] border-jumpa-primary-100 bg-jumpa-primary-50 text-jumpa-primary-950"
            }`}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}
