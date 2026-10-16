import { ReceiptAltIcon } from "@/components/ui/icons/receipt-alt";
import { XmarkIcon } from "@/components/ui/icons/xmark";
import type { TicketTransaction } from "@/lib/support-tickets";

/** The transaction that goes out with the next message. */
export function StagedTransaction({
  transaction,
  onRemove,
}: {
  transaction: TicketTransaction;
  onRemove: () => void;
}) {
  return (
    <div className="flex animate-rise items-center gap-2.5 rounded-surface bg-jumpa-primary-50 py-2 pr-1.5 pl-3">
      <ReceiptAltIcon className="size-5 shrink-0 text-jumpa-primary-600" />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-sm leading-4 font-semibold text-jumpa-black">
          {transaction.title}
        </span>
        <span className="truncate text-xs leading-3.5 text-jumpa-neutral-700">
          {transaction.amount} ·{" "}
          <span className="capitalize">{transaction.status}</span>
        </span>
      </span>
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove transaction"
        className="tap flex size-8 shrink-0 items-center justify-center rounded-full text-jumpa-neutral-700 active:scale-95"
      >
        <XmarkIcon className="size-4" />
      </button>
    </div>
  );
}
