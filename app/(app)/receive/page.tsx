import type { Metadata } from "next";
import { AssetPicker } from "@/components/assets/asset-picker";
import { FiatDepositView } from "@/components/receive/fiat-deposit-view";
import { ReceiveOptionList } from "@/components/transfer/receive-options";
import { TransferHeader } from "@/components/transfer/transfer-header";
import { SUPPORTED_ASSETS } from "@/lib/wallet";

import { getCachedAuthSession } from "@/lib/functions/permissionFunctions";
import { getUserNgnAccountDetails } from "@/lib/functions/ngnFunctions";

interface ReceivePageProps {
  searchParams: Promise<{ rail?: string }>;
}

export async function generateMetadata({
  searchParams,
}: ReceivePageProps): Promise<Metadata> {
  const { rail } = await searchParams;
  if (rail === "crypto") return { title: "Deposit Crypto" };
  if (rail === "fiat") return { title: "Deposit Naira" };
  return { title: "Add Money" };
}

/** Fiat or crypto, then the rail's own screen — one route, not three. */
export default async function ReceivePage({ searchParams }: ReceivePageProps) {
  const { rail } = await searchParams;

  if (rail === "fiat") {
    let initialAccount: any = null;
    try {
      const session = await getCachedAuthSession();
      if (session?.user?.id) {
        const accountData = await getUserNgnAccountDetails(
          session.user.id,
          session.user.name || "Jumpa User",
        );
        initialAccount = accountData.account;
      }
    } catch (e) {
      console.error("[ReceivePage] Failed to prefetch NGN deposit account:", e);
    }

    return <FiatDepositView initialAccount={initialAccount} />;
  }
  if (rail === "crypto") {
    return <AssetPicker assets={SUPPORTED_ASSETS} receive back="/receive" />;
  }

  return (
    <div className="flex min-h-dvh flex-col px-4.5 pt-[calc(env(safe-area-inset-top)+1.5rem)] pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
      <TransferHeader back="/home" title="Add Money" />
      <div className="mt-8">
        <ReceiveOptionList />
      </div>
    </div>
  );
}
