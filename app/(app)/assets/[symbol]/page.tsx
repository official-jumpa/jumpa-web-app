import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TokenDetailView } from "@/components/assets/token-detail-view";
import { ASSETS, TRANSACTIONS } from "@/lib/wallet";

export const metadata: Metadata = { title: "Wallet" };

export default async function TokenPage({
  params,
}: PageProps<"/assets/[symbol]">) {
  const { symbol } = await params;
  const asset = ASSETS.find(
    (entry) => entry.symbol.toLowerCase() === symbol.toLowerCase(),
  );

  if (!asset) notFound();

  return <TokenDetailView asset={asset} transactions={TRANSACTIONS} />;
}
