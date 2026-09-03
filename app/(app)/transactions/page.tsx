import type { Metadata } from "next";
import { TransactionsView } from "@/components/transactions/transactions-view";
import { TRANSACTION_FILTERS } from "@/lib/cards";

export const metadata: Metadata = { title: "Transaction History" };

export default function TransactionsPage() {
  return <TransactionsView filters={TRANSACTION_FILTERS} />;
}
