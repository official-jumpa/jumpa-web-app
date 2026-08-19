import { BackspaceIcon } from "@/components/ui/icons/backspace";

/** Reading order; the blank cell keeps "0" centred. */
const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"];

const KEY_CLASS =
  "flex items-center justify-center rounded-key border border-jumpa-neutral-100 bg-jumpa-neutral-50 " +
  "font-numeric text-4xl leading-9 text-jumpa-black transition-colors active:bg-jumpa-neutral-100";

/** Frame the auth screens put around the pad. Sits 8px wider than the gutter. */
export const KEYPAD_PANEL =
  "-mx-2 rounded-sheet border border-jumpa-black/4 bg-jumpa-white px-5.75 py-7.5";

/**
 * On-screen number pad. The auth screens wrap it in a panel; the chat PIN sheet
 * is the panel, so the frame stays out here.
 */
export function NumericKeypad({
  onDigit,
  onBackspace,
  className,
}: {
  onDigit: (digit: string) => void;
  onBackspace: () => void;
  /** Panel around the grid, if the screen calls for one. */
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="grid h-69.5 grid-cols-3 grid-rows-4 gap-x-3 gap-y-2.5">
        {KEYS.map((key) =>
          key === "" ? (
            <span key="blank" />
          ) : key === "del" ? (
            <button
              key={key}
              type="button"
              onClick={onBackspace}
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
