import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { AssetPicker } from "@/components/assets/asset-picker";
import { DepositInfo } from "@/components/assets/deposit-info";
import { TokenDetailView } from "@/components/assets/token-detail-view";
import { chainsFor, resolveChainAddresses } from "@/lib/blockchain";
import { getSession } from "@/lib/session";
import { getAssetPriceUsd } from "@/lib/wallet-balances";
import { SUPPORTED_ASSETS, TRANSACTIONS } from "@/lib/wallet";

interface AssetsPageProps {
  searchParams: Promise<{
    token?: string;
    network?: string;
    deposit?: string;
  }>;
}

export async function generateMetadata({
  searchParams,
}: AssetsPageProps): Promise<Metadata> {
  const { token, deposit } = await searchParams;

  if (!token) {
    return { title: "All Wallets" };
  }

  const asset = SUPPORTED_ASSETS.find(
    (entry) => entry.symbol.toLowerCase() === token.toLowerCase(),
  );
  const symbol = asset?.symbol ?? token.toUpperCase();

  if (deposit === "1" || deposit === "true") {
    return { title: `Deposit ${symbol}` };
  }

  return { title: `${symbol} Wallet` };
}

export default async function AssetsPage({ searchParams }: AssetsPageProps) {
  const { token, network, deposit } = await searchParams;

  // 1. List View: Render full asset list when no specific token is selected
  if (!token) {
    return <AssetPicker assets={SUPPORTED_ASSETS} />;
  }

  const asset = SUPPORTED_ASSETS.find(
    (entry) => entry.symbol.toLowerCase() === token.toLowerCase(),
  );
  if (!asset) notFound();

  // 2. Deposit View: Render receive / deposit information
  if (deposit === "1" || deposit === "true") {
    const session = await getSession();
    if (!session?.userId || !session.addresses) redirect("/onboarding");

    const [chains, priceUsd] = await Promise.all([
      Promise.resolve(
        resolveChainAddresses(session.addresses, chainsFor(asset.symbol)),
      ),
      getAssetPriceUsd(asset.symbol),
    ]);

    const chosen = chains.find((chain) => chain.id === network) ?? chains[0];

    return (
      <DepositInfo
        symbol={asset.symbol}
        chains={chains}
        initialChain={chosen}
        priceUsd={priceUsd}
      />
    );
  }

  // 3. Detail View: Render single token wallet & transaction view
  const chains = chainsFor(asset.symbol);
  const chain =
    chains.find((entry) => entry.id === network) ??
    (chains.length === 1 ? chains[0] : undefined);

  return (
    <TokenDetailView
      asset={asset}
      chains={chains}
      chain={chain}
      transactions={TRANSACTIONS}
    />
  );
}
