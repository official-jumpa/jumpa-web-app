import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import type { VirtualCard } from "@/lib/cards";

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-card border border-jumpa-neutral-100 px-4 py-3">
      <span className="text-xs leading-3.5 text-jumpa-neutral-400">
        {label}
      </span>
      <span className="text-base leading-4.5 font-semibold text-jumpa-primary-600">
        {value}
      </span>
    </div>
  );
}

/** Full card credentials, opened from Details. */
export function CardDetailsSheet({
  card,
  onClose,
}: {
  card: VirtualCard;
  onClose: () => void;
}) {
  return (
    <BottomSheet onClose={onClose}>
      <h2 className="text-center text-base leading-4.5 font-semibold text-jumpa-black">
        Card Details
      </h2>

      <div className="mt-4 flex flex-col gap-2">
        <Field label="Card Number" value={card.number} />
        <Field label="Expiry Date" value={card.expiry} />
        <Field label="CVV" value={card.cvv} />
      </div>

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
