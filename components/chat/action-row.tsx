const BUTTON =
  "flex h-9 flex-1 items-center justify-center rounded-pill text-sm leading-4 font-medium";

/** Confirm / cancel pair under an agent proposal. Confirm raises the PIN sheet. */
export function ActionRow({
  onConfirm,
  onCancel,
}: {
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="flex w-52 gap-2">
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
