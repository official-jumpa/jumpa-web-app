import type { Metadata } from "next";
import { getCachedAuthSession } from "@/lib/functions/permissionFunctions";
import {
  queryUserTransactions,
  formatDbTransaction,
} from "@/lib/functions/transactionFunctions";
import { TransactionDetail } from "@/components/transactions/transaction-detail";
import { TransactionsView } from "@/components/transactions/transactions-view";
import { TRANSACTION_FILTERS } from "@/lib/cards";
import type { Transaction } from "@/lib/wallet";

type TransactionsPageProps = {
  searchParams: Promise<{ id?: string; chain?: string }>;
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
  const { id, chain } = await searchParams;

  if (id) return <TransactionDetail id={id} />;

  let initialTransactions: Transaction[] = [];

  try {
    const session = await getCachedAuthSession();
    if (session?.user?.id) {
      const { transactions: rawTx } = await queryUserTransactions({
        userId: session.user.id,
        chain: chain?.toLowerCase(),
        limit: 10,
        page: 1,
      });
      initialTransactions = rawTx.map(formatDbTransaction);
      console.log("[TransactionsPage SSR] session user:", session.user.id, "count:", initialTransactions.length);
    } else {
      console.log("[TransactionsPage SSR] No session found");
    }
  } catch (error) {
    console.warn("[TransactionsPage]:", error);
  }

  return (
    <TransactionsView
      transactions={initialTransactions}
      filters={TRANSACTION_FILTERS}
      initialChain={chain}
    />
  );
}
