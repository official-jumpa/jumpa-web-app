import type { ReactNode } from "react";
import { BackspaceIcon } from "@/components/ui/icons/backspace";
import { triggerHaptic } from "@/lib/haptics";

/** Reading order; the blank cell keeps "0" centred. */
const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"];

const KEY_CLASS =
  "tap flex items-center justify-center border border-jumpa-neutral-100 bg-jumpa-neutral-50 " +
  "font-numeric text-jumpa-black active:scale-95 active:bg-jumpa-neutral-100 " +
  "disabled:opacity-40";

/** `sm` is the same pad drawn smaller, for a screen that also carries a CTA under it. */
const SIZE = {
  md: {
    grid: "h-69.5 gap-x-3 gap-y-2.5",
    key: "rounded-key text-4xl leading-9",
    del: "h-6.5 w-10.25",
  },
  sm: {
    grid: "h-60 gap-x-2.5 gap-y-2.25",
    key: "rounded-row text-[31px] leading-8",
    del: "h-5.5 w-9",
  },
} as const;

/** Frame the auth screens put around the pad. Sits 8px wider than the gutter. */
export const KEYPAD_PANEL =
  "-mx-2 rounded-sheet border border-jumpa-black/4 bg-jumpa-white px-5.75 py-7.5";

/** On-screen number pad. Panel chrome stays outside; the chat sheet is its own panel. */
export function NumericKeypad({
  onDigit,
  onBackspace,
  disabled,
  className,
  withDecimal = false,
  leftKey,
  size = "md",
}: {
  onDigit: (digit: string) => void;
  onBackspace: () => void;
  size?: keyof typeof SIZE;
  /** Locks the pad while the entry is being checked. */
  disabled?: boolean;
  /** Panel around the grid, if the screen calls for one. */
  className?: string;
  /** Show a decimal point (.) in the bottom-left position */
  withDecimal?: boolean;
  /** Fills the bottom-left cell when there is no decimal point, e.g. a biometric key. */
  leftKey?: ReactNode;
}) {
  const keys = [
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    withDecimal ? "." : "",
    "0",
    "del",
  ];
  const style = SIZE[size];
  const keyClass = `${KEY_CLASS} ${style.key}`;

  return (
    <div className={className}>
      <div className={`grid grid-cols-3 grid-rows-4 ${style.grid}`}>
        {keys.map((key, index) =>
          key === "" ? (
            <span key={`blank-${index}`} className="flex items-center justify-center">
              {leftKey}
            </span>
          ) : key === "del" ? (
            <button
              key={key}
              type="button"
              onClick={() => {
                triggerHaptic("light");
                onBackspace();
              }}
              disabled={disabled}
              aria-label="Delete"
              className={keyClass}
            >
              <BackspaceIcon className={style.del} />
            </button>
          ) : (
            <button
              key={key}
              type="button"
              onClick={() => {
                triggerHaptic("light");
                onDigit(key);
              }}
              disabled={disabled}
              className={keyClass}
            >
              {key}
            </button>
          ),
        )}
      </div>
    </div>
  );
}
