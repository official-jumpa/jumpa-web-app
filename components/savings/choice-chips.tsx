"use client";

/**
 * Pill row used for lock terms, target terms and goal categories.
 *
 * `caption` turns a chip two-line — the term on top, the rate it earns under
 * it — so the rate is visible while choosing rather than after.
 */
export function ChoiceChips({
  options,
  value,
  onChange,
  caption,
}: {
  options: readonly string[];
  value: string;
  onChange: (next: string) => void;
  /** Returns the second line for an option, or nothing for a one-line chip. */
  caption?: (option: string) => string | undefined;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const active = option === value;
        const second = caption?.(option);
        return (
          <button
            key={option}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option)}
            className={`tap flex min-w-0 flex-1 flex-col items-center justify-center rounded-pill px-2 whitespace-nowrap active:scale-95 ${
              second ? "h-12 gap-0.5" : "h-9"
            } ${
              active
                ? "bg-jumpa-primary-600 text-jumpa-primary-50"
                : "border-[1.32px] border-jumpa-primary-100 bg-jumpa-primary-50 text-jumpa-primary-950"
            }`}
          >
            <span className="text-xs leading-4 font-medium">{option}</span>
            {second ? (
              <span
                className={`text-[10px] leading-3 font-semibold ${
                  active ? "text-jumpa-alt-400" : "text-jumpa-primary-600"
                }`}
              >
                {second}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
