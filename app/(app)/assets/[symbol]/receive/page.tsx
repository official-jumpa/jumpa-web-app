import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DepositInfo } from "@/components/assets/deposit-info";
import { chainsFor } from "@/lib/networks";
import { ASSETS } from "@/lib/wallet";

export const metadata: Metadata = { title: "Receive" };

export default async function DepositPage({
  params,
  searchParams,
}: PageProps<"/assets/[symbol]/receive">) {
  const { symbol } = await params;
  const { network } = await searchParams;

  const asset = ASSETS.find(
    (entry) => entry.symbol.toLowerCase() === symbol.toLowerCase(),
  );
  if (!asset) notFound();

  const chains = chainsFor(asset.symbol);
  const chosen = chains.find((chain) => chain.id === network) ?? chains[0];

  return (
    <DepositInfo
      symbol={asset.symbol}
      chains={chains}
      initialChain={chosen}
    />
  );
}
