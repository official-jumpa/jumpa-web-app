import { TransactionEmpty } from "@/components/transactions/transaction-empty";
import {
  TransactionRow,
  TransactionRule,
} from "@/components/transactions/transaction-row";
import type { Transaction } from "@/lib/wallet";

/** Full history. Same row as the home card, without the card around it. */
export function TransactionList({
  transactions,
}: {
  transactions: Transaction[];
}) {
  if (transactions.length === 0) {
    return <TransactionEmpty className="py-16" />;
  }

  return (
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
  );
}
