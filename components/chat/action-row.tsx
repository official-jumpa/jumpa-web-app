const BUTTON =
  "flex h-6.75 flex-1 items-center justify-center rounded-pill text-xs leading-3 font-medium";

/** Confirm / cancel pair under an agent proposal. Confirm raises the PIN sheet. */
export function ActionRow({
  onConfirm,
  onCancel,
}: {
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="flex w-44.25 gap-1.5">
      <button
        type="button"
        onClick={onCancel}
        className={`${BUTTON} bg-jumpa-neutral-750 text-jumpa-neutral-275`}
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={onConfirm}
        className={`${BUTTON} bg-jumpa-primary-600 text-jumpa-neutral-25`}
      >
        Confirm
      </button>
    </div>
  );
}
