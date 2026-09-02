import { cn } from "@/lib/cn";

/** The design's two boxes: auth panel and chat sheet. */
const TONE = {
  panel: {
    box: "h-25 gap-5 rounded-panel border border-jumpa-primary-100 bg-jumpa-primary-50",
    slot: "w-7.5",
    digit: "mb-3.5 text-4xl",
    rule: "h-0.75",
    idle: "text-jumpa-primary-950",
    ink: "",
  },
  sheet: {
    box: "h-20 gap-3 rounded-key border border-jumpa-neutral-275/10",
    slot: "w-8",
    digit: "mb-2 text-3xl",
    rule: "h-1",
    idle: "text-jumpa-pin-rule",
    ink: "text-jumpa-black",
  },
} as const;

/** Fixed-length code box. `leading-[0]` keeps each rule on the baseline. */
export function PinDisplay({
  length,
  value,
  label,
  tone = "panel",
  error,
  reveal,
  autoFocus,
  onValueChange,
}: {
  length: number;
  value: string;
  /** Optional caption above the box, e.g. "Enter your pin". */
  label?: string;
  tone?: keyof typeof TONE;
  /** Tints every slot red — a rejected PIN, not a separate screen. */
  error?: boolean;
  /** Show the digits instead of masking them — right for a code, not a PIN. */
  reveal?: boolean;
  autoFocus?: boolean;
  /** Enables typing, pasting and OTP autofill through a transparent field. */
  onValueChange?: (next: string) => void;
}) {
  const style = TONE[tone];

  return (
    <div className="flex flex-col gap-6">
      {label ? (
        <p className="text-base leading-5.5 font-medium text-jumpa-black">
          {label}
        </p>
      ) : null}

      <div
        className={cn("relative flex items-center justify-center", style.box)}
      >
        {Array.from({ length }, (_, slot) => {
          // Where the next digit lands — the caret slot.
          const active = slot === value.length;
          return (
            <span
              // biome-ignore lint/suspicious/noArrayIndexKey: slots never reorder
              key={slot}
              className={cn(
                "relative flex h-10 flex-col justify-end",
                style.slot,
                error
                  ? "text-jumpa-danger"
                  : active
                    ? "text-jumpa-primary-600"
                    : style.idle,
              )}
            >
              <span
                className={cn(
                  "text-center font-numeric leading-[0]",
                  style.digit,
                  error ? undefined : style.ink,
                )}
              >
                {slot < value.length ? (reveal ? value[slot] : "*") : ""}
              </span>

              {active && !error ? (
                <span
                  aria-hidden="true"
                  className="absolute inset-x-0 bottom-2 mx-auto h-6 w-0.5 animate-caret rounded-full bg-current"
                />
              ) : null}

              <span
                className={cn("w-full rounded-full bg-current", style.rule)}
              />
            </span>
          );
        })}

        {onValueChange ? (
          // Transparent, not hidden: paste and autofill need a real field.
          // `inputMode="none"` keeps the OS keyboard off the on-screen pad.
          <input
            type="text"
            value={value}
            onChange={(event) => onValueChange(event.target.value)}
            // Paste replaces rather than appends; no maxLength, it counts separators.
            onPaste={(event) => {
              event.preventDefault();
              onValueChange(event.clipboardData.getData("text"));
            }}
            inputMode="none"
            autoComplete="one-time-code"
            autoCorrect="off"
            spellCheck={false}
            // biome-ignore lint/a11y/noAutofocus: the screen exists to take this entry
            autoFocus={autoFocus}
            aria-label={label ?? (reveal ? "Verification code" : "PIN")}
            className="absolute inset-0 size-full bg-transparent text-center text-transparent caret-transparent outline-none"
          />
        ) : null}
      </div>
    </div>
  );
}
