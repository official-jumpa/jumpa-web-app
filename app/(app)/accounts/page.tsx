import type { Metadata } from "next";
import { AccountsView } from "@/components/accounts/accounts-view";
import { getUserNgnAccount } from "@/lib/functions/ngnFunctions";
import { getCachedAuthSession } from "@/lib/functions/permissionFunctions";
import { formatNaira } from "@/lib/naira-deposit";

export const metadata: Metadata = { title: "Accounts" };

export default async function AccountsPage() {
  const session = await getCachedAuthSession();
  const userId = session?.user?.id;
  const account = userId
    ? await getUserNgnAccount(userId).catch(() => null)
    : null;

  return (
    <AccountsView
      initialHasAccount={Boolean(account)}
      initialBalance={
        account ? formatNaira(Number(account.balance ?? 0)) : null
      }
    />
  );
}
