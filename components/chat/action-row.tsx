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
}: {
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  cancelLabel?: string | false;
}) {
  if (cancelLabel === false) {
    return (
      <button
        type="button"
        onClick={onConfirm}
        className={`${BUTTON} self-start bg-jumpa-primary-600 px-4 text-jumpa-neutral-25`}
      >
        {confirmLabel}
      </button>
    );
  }

  return (
    <div className="flex w-52 gap-1.75">
      <button
        type="button"
        onClick={onCancel}
        className={`${BUTTON} flex-1 bg-jumpa-neutral-750 text-jumpa-neutral-275`}
      >
        {cancelLabel}
      </button>
      <button
        type="button"
        onClick={onConfirm}
        className={`${BUTTON} flex-1 bg-jumpa-primary-600 text-jumpa-neutral-25`}
      >
        {confirmLabel}
      </button>
    </div>
  );
}
