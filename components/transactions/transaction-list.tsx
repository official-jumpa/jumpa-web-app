import type { RefObject } from "react";
import { TransactionEmpty } from "@/components/transactions/transaction-empty";
import {
  TransactionRow,
  TransactionRule,
} from "@/components/transactions/transaction-row";
import { ChevronDownMdIcon } from "@/components/ui/icons/chevron-down-md";
import { JumpaLoader } from "@/components/ui/jumpa-loader";
import type { Transaction } from "@/lib/wallet";

/** Full history under a "Transactions" heading whose type pill opens the filters. */
export function TransactionList({
  transactions,
  typeLabel,
  onType,
  sentinelRef,
  loadingMore,
  onSelect,
}: {
  transactions: Transaction[];
  /** The active Transaction Type filter, "All" when none. */
  typeLabel?: string;
  /** Opens the filters from the type pill; without it the pill is not drawn. */
  onType?: () => void;
  sentinelRef?: RefObject<HTMLDivElement | null>;
  loadingMore?: boolean;
  /** Opens a row in place instead of linking to its detail screen. */
  onSelect?: (transaction: Transaction) => void;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xs leading-4.5 font-medium tracking-jumpa-snug text-jumpa-navy-900">
          Transactions
        </h2>
        {onType ? (
          <button
            type="button"
            onClick={onType}
            className="tap flex items-center text-xs leading-none tracking-jumpa-snug text-jumpa-grey-450 active:scale-95"
          >
            {typeLabel}
            <ChevronDownMdIcon className="size-4.5" />
          </button>
        ) : null}
      </div>

      {transactions.length === 0 ? (
        <TransactionEmpty variant="history" className="pt-17.75" />
      ) : (
        <ul className="flex flex-col gap-2.5">
          {transactions.map((transaction, index) => (
            <li key={transaction.id || index} className="flex flex-col gap-2.5">
              {index > 0 ? <TransactionRule /> : null}
              <TransactionRow
                transaction={transaction}
                variant="history"
                onSelect={onSelect}
              />
            </li>
          ))}
        </ul>
      )}

      {/* Infinite scroll sentinel */}
      {sentinelRef && transactions.length > 0 ? (
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
    </section>
  );
}
