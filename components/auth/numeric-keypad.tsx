import { BackspaceIcon } from "@/components/ui/icons/backspace";

/** Reading order; the blank cell keeps "0" centred. */
const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"];

const KEY_CLASS =
  "tap flex items-center justify-center rounded-key border border-jumpa-neutral-100 bg-jumpa-neutral-50 " +
  "font-numeric text-4xl leading-9 text-jumpa-black active:scale-95 active:bg-jumpa-neutral-100 " +
  "disabled:opacity-40";

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
}: {
  onDigit: (digit: string) => void;
  onBackspace: () => void;
  /** Locks the pad while the entry is being checked. */
  disabled?: boolean;
  /** Panel around the grid, if the screen calls for one. */
  className?: string;
  /** Show a decimal point (.) in the bottom-left position */
  withDecimal?: boolean;
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

  return (
    <div className={className}>
      <div className="grid h-69.5 grid-cols-3 grid-rows-4 gap-x-3 gap-y-2.5">
        {keys.map((key, index) =>
          key === "" ? (
            <span key={`blank-${index}`} />
          ) : key === "del" ? (
            <button
              key={key}
              type="button"
              onClick={onBackspace}
              disabled={disabled}
              aria-label="Delete"
              className={KEY_CLASS}
            >
              <BackspaceIcon className="h-6.5 w-10.25" />
            </button>
          ) : (
            <button
              key={key}
              type="button"
              onClick={() => onDigit(key)}
              disabled={disabled}
              className={KEY_CLASS}
            >
              {key}
            </button>
          ),
        )}
      </div>
    </div>
  );
}
