import { TransactionRow } from "@/components/transactions/transaction-row";
import type { TicketTransaction } from "@/lib/support-tickets";

/** A transaction sent into the conversation. Tapping it opens its detail screen. */
export function SharedTransaction({
  transaction,
}: {
  transaction: TicketTransaction;
}) {
  return (
    <div className="flex w-70 max-w-full flex-col gap-2 rounded-surface bg-jumpa-neutral-50 p-3 ring-1 ring-jumpa-neutral-60 ring-inset">
      <span className="text-xs leading-4 font-medium text-jumpa-neutral-500">
        Shared transaction
      </span>
      <TransactionRow transaction={transaction} badge={false} />
    </div>
  );
}
