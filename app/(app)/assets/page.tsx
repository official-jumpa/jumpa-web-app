import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { AssetPicker } from "@/components/assets/asset-picker";
import { DepositInfo } from "@/components/assets/deposit-info";
import { TokenDetailView } from "@/components/assets/token-detail-view";
import { unifyTokens } from "@/lib/assets";
import { chainsFor, resolveChainAddresses } from "@/lib/blockchain";
import { getSession } from "@/lib/session";
import {
  queryUserTransactions,
  formatDbTransaction,
} from "@/lib/functions/transactionFunctions";
import {
  getCachedWalletBalances,
  getAssetPriceUsd,
} from "@/lib/wallet-balances";
import { SUPPORTED_ASSETS, type Asset, type Transaction } from "@/lib/wallet";

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

/**
 * Every supported wallet, carrying the USD value of what the user actually
 * holds. The list never shrinks — an untouched wallet still shows its row.
 */
async function walletAssets(): Promise<Asset[]> {
  const session = await getSession();
  if (!session?.userId) return SUPPORTED_ASSETS;

  const balances = await getCachedWalletBalances(session.userId).catch(
    () => null,
  );
  if (!balances?.tokens?.length) return SUPPORTED_ASSETS;

  // unifyTokens sums a symbol across chains, which is what one row stands for.
  const held = new Map(
    unifyTokens(balances.tokens).map((asset) => [asset.symbol, asset.balance]),
  );

  return SUPPORTED_ASSETS.map((asset) => {
    const balance = held.get(asset.symbol);
    return balance ? { ...asset, balance } : asset;
  });
}

export default async function AssetsPage({ searchParams }: AssetsPageProps) {
  const { token, network, deposit } = await searchParams;

  // 1. List View: Render full asset list when no specific token is selected
  if (!token) {
    return <AssetPicker assets={await walletAssets()} />;
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
  // Default to matching query network, or fallback to default chain (first chain in list)
  const chain =
    chains.find((entry) => entry.id === network) ?? chains[0];

  const session = await getSession();
  let transactions: Transaction[] = [];
  const displayAsset = { ...asset };

  if (session?.userId) {
    const [txResult, balancesResult] = await Promise.all([
      queryUserTransactions({
        userId: session.userId,
        token: asset.symbol,
        chain: chain.id,
        limit: 5,
      }).catch(() => ({ transactions: [], total: 0 })),
      getCachedWalletBalances(session.userId).catch(() => null),
    ]);

    transactions = (txResult.transactions || []).map(formatDbTransaction);

    if (balancesResult?.tokens) {
      // Look for the token on the specific active chain
      const tokenMatch = balancesResult.tokens.find(
        (t) =>
          t.symbol.toUpperCase() === asset.symbol.toUpperCase() &&
          (t.network?.toLowerCase() === chain.id.toLowerCase() ||
            t.network?.toLowerCase() === chain.name.toLowerCase()),
      );

      if (tokenMatch) {
        const balNum = parseFloat(tokenMatch.balance || "0");
        const formattedBal = balNum.toLocaleString("en-US", {
          maximumFractionDigits: 4,
        });
        displayAsset.balance = `${formattedBal} ${asset.symbol}`;
      } else {
        displayAsset.balance = `0.00 ${asset.symbol}`;
      }
    }
  }

  return (
    <TokenDetailView
      asset={displayAsset}
      chains={chains}
      chain={chain}
      transactions={transactions}
    />
  );
}
