import type { Metadata } from "next";
import { AssetPicker } from "@/components/assets/asset-picker";
import { NairaDepositView } from "@/components/receive/naira-deposit-view";
import { ReceiveOptionList } from "@/components/transfer/receive-options";
import { TransferHeader } from "@/components/transfer/transfer-header";
import { getUserNgnAccount } from "@/lib/functions/ngnFunctions";
import { getCachedAuthSession } from "@/lib/functions/permissionFunctions";
import { findWalletForUser } from "@/lib/functions/walletFunctions";
import {
  isNairaToken,
  NAIRA_TOKENS,
  type NairaToken,
} from "@/lib/naira-deposit";
import { walletAssets } from "@/lib/wallet-assets";

interface ReceivePageProps {
  searchParams: Promise<{ rail?: string; token?: string }>;
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
  const { rail, token } = await searchParams;

  if (rail === "fiat" || rail === "crypto") {
    const session = await getCachedAuthSession();
    const userId = session?.user?.id;
    const assets = await walletAssets(userId);

    if (rail === "crypto") {
      return <AssetPicker assets={assets} mode="crypto" back="/receive" />;
    }

    const tokens = assets.filter((asset) => isNairaToken(asset.symbol));
    const symbol = token?.toUpperCase();
    if (!isNairaToken(symbol)) {
      return <AssetPicker assets={tokens} mode="naira" back="/receive" />;
    }

    const [wallet, ngnAccount] = userId
      ? await Promise.all([
          findWalletForUser(userId),
          getUserNgnAccount(userId).catch(() => null),
        ])
      : [null, null];
    // `change` carries the held amount ("1,234.50 USDC"); the leg wants a bare number.
    const balances = Object.fromEntries(
      NAIRA_TOKENS.map((symbol) => [
        symbol,
        tokens
          .find((asset) => asset.symbol === symbol)
          ?.change.replace(/[^\d.]/g, "") || "0",
      ]),
    ) as Record<NairaToken, string>;

    return (
      <NairaDepositView
        initialToken={symbol}
        addresses={wallet?.addresses ?? {}}
        balances={balances}
        nairaBalance={ngnAccount ? Number(ngnAccount.balance ?? 0) : undefined}
      />
    );
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
