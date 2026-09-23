import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { HomeView } from "@/components/home/home-view";
import { getCachedAuthSession } from "@/lib/functions/permissionFunctions";
import {
  queryUserTransactions,
  formatDbTransaction,
} from "@/lib/functions/transactionFunctions";
import { getKycRecordByUserId } from "@/lib/functions/kycFunctions";
import { getUserNotifications } from "@/lib/functions/notificationFunctions";
import { getCachedWalletBalances } from "@/lib/wallet-balances";
import { unifyTokens } from "@/lib/assets";
import { getUserNgnAccount } from "@/lib/functions/ngnFunctions";
import { ACCOUNT, ASSETS, type Asset, type Transaction } from "@/lib/wallet";

export const metadata: Metadata = {
  title: "Home",
};

export default async function HomePage() {
  const session = await getCachedAuthSession();
  if (!session?.user?.id) {
    redirect("/onboarding");
  }

  const userId = session.user.id;

  let initialBalance: string = ACCOUNT.balance;
  let initialAssets: Asset[] = ASSETS;
  let initialTransactions: Transaction[] = [];
  let initialKycComplete = false;
  let initialHasNgnAccount = false;
  let initialNgnBalance: string | null = null;
  let initialHasUnread = false;

  try {
    const [
      balancesResult,
      txResult,
      kycResult,
      ngnResult,
      notificationsResult,
    ] = await Promise.allSettled([
      getCachedWalletBalances(userId),
      queryUserTransactions({ userId, limit: 5 }),
      getKycRecordByUserId(userId),
      getUserNgnAccount(userId),
      getUserNotifications(userId, { unreadOnly: true, limit: 1 }),
    ]);

    if (balancesResult.status === "fulfilled" && balancesResult.value) {
      const data = balancesResult.value;
      if (data.totalUsd) {
        initialBalance = data.totalUsd;
      }
      if (Array.isArray(data.tokens) && data.tokens.length > 0) {
        initialAssets = unifyTokens(data.tokens);
      }
    }

    if (txResult.status === "fulfilled" && txResult.value?.transactions) {
      initialTransactions = txResult.value.transactions.map(formatDbTransaction);
    }

    if (kycResult.status === "fulfilled" && kycResult.value) {
      const kyc = kycResult.value;
      initialKycComplete = Boolean(
        kyc.isCompleted ||
          kyc.status === "approved" ||
          kyc.stage === "completed",
      );
    }

    if (ngnResult.status === "fulfilled" && ngnResult.value) {
      initialHasNgnAccount = true;
      const rawBal = Number(ngnResult.value.balance ?? 0);
      initialNgnBalance = `₦${rawBal.toLocaleString("en-NG", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
    }

    if (notificationsResult.status === "fulfilled" && notificationsResult.value) {
      const notifData = notificationsResult.value;
      const unreadCount =
        (notifData.tabCounts?.transactions || 0) +
        (notifData.tabCounts?.activities || 0);
      initialHasUnread = unreadCount > 0 || (notifData.notifications?.length ?? 0) > 0;
    }
  } catch (err) {
    console.warn("[HomePage SSR] Prefetch fallback:", err);
  }

  return (
    <HomeView
      initialBalance={initialBalance}
      initialAssets={initialAssets}
      initialTransactions={initialTransactions}
      initialKycComplete={initialKycComplete}
      initialHasNgnAccount={initialHasNgnAccount}
      initialNgnBalance={initialNgnBalance}
      initialHasUnread={initialHasUnread}
    />
  );
}
