import type { ReactNode } from "react";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import type { VirtualCard } from "@/lib/cards";

/** Boxed label/value pair. Shared with the funding chooser, which draws the
 *  same box with a radio at its end. */
export function CardField({
  label,
  value,
  children,
}: {
  label: string;
  value: string;
  children?: ReactNode;
}) {
  return (
    <div className="relative flex flex-col gap-2 rounded-chip px-4 py-2.5 inset-ring-1 inset-ring-jumpa-neutral-60">
      <span className="text-base leading-4.5 font-medium text-jumpa-neutral-375">
        {label}
      </span>
      <span className="text-base leading-4.5 font-medium text-jumpa-primary-950">
        {value}
      </span>
      {children}
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
        <CardField label="Card Balance" value={card.balance} />
        <CardField label="Card Number" value={card.number} />
        <CardField label="Expiry Date" value={card.expiry} />
        <CardField label="CVV" value={card.cvv} />
      </div>

      {/* The frame's CTA reads "Yes, Freeze" — the copy-paste slip every card
          sheet carries. */}
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
