import Link from "next/link";
import { Fragment } from "react";
import { TransactionEmpty } from "@/components/transactions/transaction-empty";
import {
  TransactionRow,
  TransactionRule,
} from "@/components/transactions/transaction-row";
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
        <Link href="/transactions" className="tap active:scale-95">
          See All
        </Link>
      }
    >
      {/* px-5, not the design's 24 — its own row is 13px wider than that padding allows. */}
      <div className="flex flex-col gap-4 rounded-surface border border-jumpa-neutral-60 bg-jumpa-neutral-50 px-5 py-5">
        {transactions.length === 0 ? (
          <TransactionEmpty />
        ) : (
          transactions.map((transaction, index) => (
            <Fragment key={transaction.id || (transaction as any)._id || index}>
              {index > 0 ? <TransactionRule /> : null}
              <TransactionRow transaction={transaction} />
            </Fragment>
          ))
        )}
      </div>
    </HomeSection>
  );
}
