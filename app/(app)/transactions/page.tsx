import type { Metadata } from "next";
import { TransactionDetail } from "@/components/transactions/transaction-detail";
import { TransactionsView } from "@/components/transactions/transactions-view";
import { TRANSACTION_FILTERS } from "@/lib/cards";

type TransactionsPageProps = {
  searchParams: Promise<{ id?: string }>;
};

export async function generateMetadata({
  searchParams,
}: TransactionsPageProps): Promise<Metadata> {
  const { id } = await searchParams;
  return { title: id ? "Transaction" : "Transaction History" };
}

export default async function TransactionsPage({
  searchParams,
}: TransactionsPageProps) {
  const { id } = await searchParams;

  if (id) return <TransactionDetail id={id} />;

  return <TransactionsView filters={TRANSACTION_FILTERS} />;
}
