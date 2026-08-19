import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { SealAlertIcon } from "@/components/ui/icons/seal-alert";

/** The card's transaction PIN, opened from Show PIN. */
export function CardPinSheet({
  pin,
  onClose,
}: {
  pin: string;
  onClose: () => void;
}) {
  return (
    <BottomSheet onClose={onClose}>
      <h2 className="text-center text-base leading-4.5 font-semibold text-jumpa-black">
        Your Card PIN
      </h2>

      <p className="mt-4 flex h-17 items-center justify-center rounded-card bg-jumpa-neutral-50 font-numeric text-4xl leading-9 font-semibold tracking-[0.1em] text-jumpa-primary-600">
        {pin}
      </p>

      <p className="mt-5 flex items-start gap-2 text-xs leading-4 text-jumpa-neutral-500">
        <SealAlertIcon className="size-5 shrink-0 text-jumpa-danger" />
        Never share your PIN with anyone or save it somewhere others can access.
        Keep your PIN private, even if someone claims to be from support.
      </p>

      <Button
        variant="gradientSheet"
        size="lg"
        className="mt-6"
        onClick={onClose}
      >
        Done
      </Button>
    </BottomSheet>
  );
}
