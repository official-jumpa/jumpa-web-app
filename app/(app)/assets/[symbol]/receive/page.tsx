import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DepositInfo } from "@/components/assets/deposit-info";
import { ASSETS } from "@/lib/wallet";

export const metadata: Metadata = { title: "Receive" };

export default async function DepositPage({
  params,
}: PageProps<"/assets/[symbol]/receive">) {
  const { symbol } = await params;
  const asset = ASSETS.find(
    (entry) => entry.symbol.toLowerCase() === symbol.toLowerCase(),
  );

  if (!asset) notFound();

  return <DepositInfo symbol={asset.symbol} />;
}
