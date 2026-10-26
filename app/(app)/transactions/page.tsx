import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCachedAuthSession } from "@/lib/functions/permissionFunctions";
import {
  queryUserTransactions,
  formatDbTransaction,
  getTransactionById,
} from "@/lib/functions/transactionFunctions";
import { TransactionDetail } from "@/components/transactions/transaction-detail";
import { TransactionsView } from "@/components/transactions/transactions-view";
import { TRANSACTION_FILTERS } from "@/lib/cards";
import type { Transaction } from "@/lib/wallet";

type TransactionsPageProps = {
  searchParams: Promise<{
    id?: string;
    chain?: string;
    type?: string;
    status?: string;
    duration?: string;
  }>;
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
  const params = await searchParams;

  let hasUppercase = false;
  const cleanParams = new URLSearchParams();

  for (const [key, val] of Object.entries(params)) {
    if (!val) continue;
    const lowerKey = key.toLowerCase();
    let lowerVal = val.toLowerCase();
    if (lowerKey === "id") {
      lowerVal = lowerVal.replace(/^tx_/i, "");
    }
    if (key !== lowerKey || val !== lowerVal) {
      hasUppercase = true;
    }
    cleanParams.set(lowerKey, lowerVal);
  }

  if (hasUppercase) {
    redirect(`/transactions?${cleanParams.toString()}`);
  }

  const id = params.id ? params.id.replace(/^tx_/i, "").toLowerCase() : undefined;
  const chain = params.chain?.toLowerCase();
  const type = params.type?.toLowerCase();
  const status = params.status?.toLowerCase();
  const duration = params.duration?.toLowerCase();

  let initialTransactions: Transaction[] = [];
  let initialTransactionDetail: Transaction | null = null;
  let accountEmail: string | undefined;

  try {
    const session = await getCachedAuthSession();
    accountEmail = session?.user?.email ?? undefined;
    if (session?.user?.id) {
      if (id) {
        const tx = await getTransactionById(id, session.user.id);
        if (tx) {
          initialTransactionDetail = formatDbTransaction(tx);
        }
      } else {
        const { transactions: rawTx } = await queryUserTransactions({
          userId: session.user.id,
          chain,
          type,
          status,
          duration,
          limit: 15,
          page: 1,
        });
        initialTransactions = rawTx.map(formatDbTransaction);
      }
    } else {
      console.log("No session found");
    }
  } catch (error) {
    console.warn("[TransactionsPage]:", error);
  }

  if (id) {
    return <TransactionDetail id={id} initialTransaction={initialTransactionDetail} />;
  }

  return (
    <TransactionsView
      transactions={initialTransactions}
      filters={TRANSACTION_FILTERS}
      initialChain={chain}
      accountEmail={accountEmail}
    />
  );
}
