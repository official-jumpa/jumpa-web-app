import type { Transaction } from "@/lib/wallet";

/** Full history. Merchant logos need a real source, so the slot stays blank. */
export function TransactionList({
  transactions,
}: {
  transactions: Transaction[];
}) {
  return (
    <ul className="flex flex-col">
      <li className="mb-2 text-[10px] leading-3 text-jumpa-neutral-350">
        All Transactions
      </li>
      {transactions.map((transaction, index) => (
        <li key={transaction.id}>
          {index > 0 ? <hr className="my-4 border-jumpa-neutral-100" /> : null}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <span className="size-10 shrink-0 rounded-panel bg-jumpa-neutral-50" />
              <span className="flex flex-col gap-0.5 font-medium">
                <span className="text-xs leading-3.5 text-jumpa-black">
                  {transaction.merchant}
                </span>
                <span className="text-[10px] leading-3 text-jumpa-neutral-400">
                  {transaction.date}
                </span>
              </span>
            </div>
            <span className="text-sm leading-4 font-semibold text-jumpa-neutral-700">
              {transaction.amount}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}
