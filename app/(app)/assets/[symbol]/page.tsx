import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TokenDetailView } from "@/components/assets/token-detail-view";
import { chainsFor } from "@/lib/blockchain";
import { SUPPORTED_ASSETS, TRANSACTIONS } from "@/lib/wallet";

export const metadata: Metadata = { title: "Wallet" };

export default async function TokenPage({
  params,
  searchParams,
}: PageProps<"/assets/[symbol]">) {
  const { symbol } = await params;
  const { network } = await searchParams;
  const asset = SUPPORTED_ASSETS.find(
    (entry) => entry.symbol.toLowerCase() === symbol.toLowerCase(),
  );

  if (!asset) notFound();

  // A single-chain asset has nothing to ask, so it is always scoped; a
  // multi-chain one is only scoped once the picker has been through.
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
