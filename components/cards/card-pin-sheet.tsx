import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { SealAlertIcon } from "@/components/ui/icons/seal-alert";

/** The card's transaction PIN — from Show PIN, and after a card is created. */
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

      <p className="mt-4 flex h-16 items-center justify-center rounded-chip border border-jumpa-neutral-60 bg-jumpa-neutral-50 font-numeric text-[40px] leading-11 font-medium text-jumpa-primary-950">
        {pin}
      </p>

      <p className="mt-8 flex items-center gap-2 text-xs leading-3.5 text-jumpa-black">
        <SealAlertIcon className="size-6 shrink-0 text-jumpa-danger" />
        Never share your PIN with anyone or save it somewhere others can access.
        Keep your PIN private, even if someone claims to be from support.
      </p>

      <Button
        variant="gradientSheet"
        size="lg"
        className="mt-8"
        onClick={onClose}
      >
        Done
      </Button>
    </BottomSheet>
  );
}
