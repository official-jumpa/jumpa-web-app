import type { Metadata } from "next";
import { TransactionsView } from "@/components/transactions/transactions-view";
import { TRANSACTION_FILTERS } from "@/lib/cards";
import { TRANSACTIONS } from "@/lib/wallet";

export const metadata: Metadata = { title: "Transaction History" };

export default function TransactionsPage() {
  return (
    <TransactionsView
      transactions={TRANSACTIONS}
      filters={TRANSACTION_FILTERS}
    />
  );
}
