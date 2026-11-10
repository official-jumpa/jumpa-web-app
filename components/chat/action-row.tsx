const BUTTON =
  "tap flex h-8 items-center justify-center rounded-panel text-sm leading-4 font-medium active:scale-95";

/**
 * Confirm / cancel pair under an agent proposal. Confirm raises the PIN sheet.
 * `cancelLabel={false}` gives the design's lone purple pill.
 */
export function ActionRow({
  onConfirm,
  onCancel,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  fit = false,
}: {
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  cancelLabel?: string | false;
  /** Each button hugs its label, for a confirm label too long for the fixed pair. */
  fit?: boolean;
}) {
  if (cancelLabel === false) {
    return (
      <button
        type="button"
        onClick={onConfirm}
        className={`${BUTTON} w-fit self-start bg-jumpa-primary-600 px-4 text-jumpa-neutral-25`}
      >
        {confirmLabel}
      </button>
    );
  }

  return (
    <div className={fit ? "flex gap-1.75 self-start" : "flex w-52 gap-1.75"}>
      <button
        type="button"
        onClick={onCancel}
        className={`${BUTTON} ${fit ? "px-4" : "flex-1"} bg-jumpa-neutral-750 text-jumpa-neutral-275`}
      >
        {cancelLabel}
      </button>
      <button
        type="button"
        onClick={onConfirm}
        className={`${BUTTON} ${fit ? "px-4" : "flex-1"} bg-jumpa-primary-600 text-jumpa-neutral-25`}
      >
        {confirmLabel}
      </button>
    </div>
  );
}
