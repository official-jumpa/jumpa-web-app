import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { NgnAccountDetails } from "@/components/ngn/ngn-account-details";
import { NgnAccountView } from "@/components/ngn/ngn-account-view";
import { isUserKycVerified } from "@/lib/functions/kycFunctions";
import {
  getUserNgnAccountDetails,
  hasActiveNgnAccount,
} from "@/lib/functions/ngnFunctions";
import { getCachedAuthSession } from "@/lib/functions/permissionFunctions";
import {
  formatDbTransaction,
  queryUserTransactions,
} from "@/lib/functions/transactionFunctions";

interface NgnAccountPageProps {
  searchParams: Promise<{ view?: string }>;
}

export async function generateMetadata({
  searchParams,
}: NgnAccountPageProps): Promise<Metadata> {
  const { view } = await searchParams;
  return { title: view === "details" ? "NGN Account" : "Open NGN Account" };
}

/** Opening the account and the account itself — one route, not two. */
export default async function NgnAccountPage({
  searchParams,
}: NgnAccountPageProps) {
  const { view } = await searchParams;

  if (view === "details") {
    let initialAccount: any = null;
    let initialBalance: any = null;
    let initialTransactions: any[] = [];

    try {
      const session = await getCachedAuthSession();
      if (session?.user?.id) {
        const userId = session.user.id;
        const [accountData, txData] = await Promise.all([
          getUserNgnAccountDetails(userId, session.user.name || "Jumpa User"),
          queryUserTransactions({ userId, chain: "fiat", limit: 10 }),
        ]);

        initialAccount = accountData.account;
        initialBalance = accountData.balance;

        if (txData?.transactions) {
          initialTransactions = txData.transactions.map(formatDbTransaction);
        }
      }
    } catch (err) {
      console.warn("[NgnAccountPage SSR] Prefetch fallback:", err);
    }

    return (
      <NgnAccountDetails
        initialAccount={initialAccount}
        initialBalance={initialBalance}
        initialTransactions={initialTransactions}
      />
    );
  }

  if (view) notFound();

  const session = await getCachedAuthSession();
  if (session?.user?.id) {
    const hasAccount = await hasActiveNgnAccount(session.user.id);
    if (hasAccount) {
      redirect("/ngn-account?view=details");
    }
    const isKycDone = await isUserKycVerified(session.user.id);
    if (!isKycDone) {
      redirect("/kyc");
    }
  }

  return <NgnAccountView />;
}
