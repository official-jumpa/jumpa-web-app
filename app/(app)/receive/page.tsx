import type { Metadata } from "next";
import { AssetPicker } from "@/components/assets/asset-picker";
import { FiatDeposit } from "@/components/transfer/fiat-deposit";
import { ReceiveOptionList } from "@/components/transfer/receive-options";
import { TransferHeader } from "@/components/transfer/transfer-header";
import { SUPPORTED_ASSETS } from "@/lib/wallet";

interface ReceivePageProps {
  searchParams: Promise<{ rail?: string }>;
}

export async function generateMetadata({
  searchParams,
}: ReceivePageProps): Promise<Metadata> {
  const { rail } = await searchParams;
  if (rail === "crypto") return { title: "Deposit Crypto" };
  if (rail === "fiat") return { title: "Deposit Fiat" };
  return { title: "Add Money" };
}

/** Fiat or crypto, then the rail's own screen — one route, not three. */
export default async function ReceivePage({ searchParams }: ReceivePageProps) {
  const { rail } = await searchParams;

  if (rail === "fiat") return <FiatDeposit />;
  if (rail === "crypto") {
    return <AssetPicker assets={SUPPORTED_ASSETS} receive back="/receive" />;
  }

  return (
    <div className="flex min-h-dvh flex-col px-4.5 pt-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
      <TransferHeader back="/home" title="Add Money" />
      <div className="mt-8">
        <ReceiveOptionList />
      </div>
    </div>
  );
}
