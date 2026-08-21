import Link from "next/link";
import type { Transaction } from "@/lib/wallet";
import { HomeSection } from "./home-section";

/** Recent activity. Displays transactions or empty state for new wallets. */
export function TransactionHistory({
  transactions,
}: {
  transactions: Transaction[];
}) {
  return (
    <HomeSection
      title="Transaction History"
      className="mt-4 gap-4"
      action={
        <Link
          href="/transactions"
          className="text-xs leading-4 font-medium text-jumpa-primary-600"
        >
          See All
        </Link>
      }
    >
      {transactions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-6 text-center text-jumpa-neutral-400">
          <p className="text-xs leading-4 font-medium">No transactions yet</p>
          <p className="text-[10px] text-jumpa-neutral-400/60 mt-1">
            Your recent transfer and swap activities will appear here.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col">
          {transactions.map((transaction, index) => (
            <li key={transaction.id}>
              {index > 0 ? (
                <hr className="my-4 border-jumpa-neutral-100" />
              ) : null}
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
      )}
    </HomeSection>
  );
}
