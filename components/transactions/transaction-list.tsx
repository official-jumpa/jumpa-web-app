import type { RefObject } from "react";
import { TransactionEmpty } from "@/components/transactions/transaction-empty";
import {
  TransactionRow,
  TransactionRule,
} from "@/components/transactions/transaction-row";
import { JumpaLoader } from "@/components/ui/jumpa-loader";
import type { Transaction } from "@/lib/wallet";

/** Full history. Same row as the home card, without the card around it. */
export function TransactionList({
  transactions,
  sentinelRef,
  loadingMore,
}: {
  transactions: Transaction[];
  sentinelRef?: RefObject<HTMLDivElement | null>;
  loadingMore?: boolean;
}) {
  if (transactions.length === 0) {
    return <TransactionEmpty className="py-16" />;
  }

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col gap-4">
        <li className="text-[10px] leading-3 text-jumpa-neutral-350">
          All Transactions
        </li>
        {transactions.map((transaction, index) => (
          <li
            key={transaction.id || (transaction as any)._id || index}
            className="flex flex-col gap-4"
          >
            {index > 0 ? <TransactionRule /> : null}
            <TransactionRow transaction={transaction} />
          </li>
        ))}
      </ul>

      {/* Infinite scroll sentinel */}
      {sentinelRef ? (
        <div ref={sentinelRef} className="h-6 w-full" aria-hidden="true" />
      ) : null}

      {loadingMore ? (
        <div className="flex justify-center py-4">
          <JumpaLoader
            className="size-8"
            markClassName="w-4"
            label="Loading more transactions"
          />
        </div>
      ) : null}
    </div>
  );
}
