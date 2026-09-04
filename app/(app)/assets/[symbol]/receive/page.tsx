import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { DepositInfo } from "@/components/assets/deposit-info";
import { chainsFor, resolveChainAddresses } from "@/lib/blockchain";
import { getSession } from "@/lib/session";
import { getAssetPriceUsd } from "@/lib/wallet-balances";
import { SUPPORTED_ASSETS } from "@/lib/wallet";

export const metadata: Metadata = { title: "Receive" };

export default async function DepositPage({
  params,
  searchParams,
}: PageProps<"/assets/[symbol]/receive">) {
  const { symbol } = await params;
  const { network } = await searchParams;

  const asset = SUPPORTED_ASSETS.find(
    (entry) => entry.symbol.toLowerCase() === symbol.toLowerCase(),
  );
  if (!asset) notFound();

  const session = await getSession();
  if (!session?.userId || !session.addresses) redirect("/auth/login");

  const [chains, priceUsd] = await Promise.all([
    Promise.resolve(resolveChainAddresses(session.addresses, chainsFor(asset.symbol))),
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

