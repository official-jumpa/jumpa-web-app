import { cn } from "@/lib/cn";

/** Masked fixed-length code. `leading-[0]` keeps each rule on the baseline. */
export function PinDisplay({
  length,
  value,
  label,
  reveal,
  onValueChange,
}: {
  length: number;
  value: string;
  /** Optional caption above the box, e.g. "Enter your pin". */
  label?: string;
  /** Show the digits instead of masking them — right for a code, not a PIN. */
  reveal?: boolean;
  /** Enables typing, pasting and OTP autofill through a transparent field. */
  onValueChange?: (next: string) => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      {label ? (
        <p className="text-base leading-5.5 font-medium text-jumpa-black">
          {label}
        </p>
      ) : null}

      <div className="relative flex h-25 items-center justify-center gap-5 rounded-panel border border-jumpa-primary-100 bg-jumpa-primary-50">
        {Array.from({ length }, (_, slot) => {
          // The next digit lands here, so this is the slot that carries the caret.
          const active = slot === value.length;
          return (
            <span
              // biome-ignore lint/suspicious/noArrayIndexKey: slots never reorder
              key={slot}
              className={cn(
                "relative flex h-10 w-7.5 flex-col justify-end",
                active ? "text-jumpa-primary-600" : "text-jumpa-primary-950",
              )}
            >
              <span className="mb-3.5 text-center font-numeric text-4xl leading-[0]">
                {slot < value.length ? (reveal ? value[slot] : "*") : ""}
              </span>

              {active ? (
                <span
                  aria-hidden="true"
                  className="absolute inset-x-0 bottom-2 mx-auto h-6 w-0.5 animate-caret rounded-full bg-current"
                />
              ) : null}

              <span className="h-0.75 w-full rounded-full bg-current" />
            </span>
          );
        })}

        {onValueChange ? (
          // Transparent, not hidden: the paste callout and autofill need a real
          // field to land on. `inputMode="none"` keeps the OS keyboard down,
          // since the on-screen pad is the keyboard on this screen.
          <input
            type="text"
            value={value}
            onChange={(event) => onValueChange(event.target.value)}
            // A pasted code replaces the value rather than appending to it, and
            // carries its own separators — no maxLength, or those get counted.
            onPaste={(event) => {
              event.preventDefault();
              onValueChange(event.clipboardData.getData("text"));
            }}
            inputMode="none"
            autoComplete="one-time-code"
            autoCorrect="off"
            spellCheck={false}
            aria-label={label ?? "Verification code"}
            className="absolute inset-0 size-full rounded-panel bg-transparent text-center text-transparent caret-transparent outline-none"
          />
        ) : null}
      </div>
    </div>
  );
}
