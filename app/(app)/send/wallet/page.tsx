import type { Metadata } from "next";
import { WalletAddressView } from "@/components/send/wallet-address-view";

export const metadata: Metadata = { title: "Wallet address" };

interface WalletAddressPageProps {
  /** `?address=` is how `/send/scan` hands a scanned code back. */
  searchParams: Promise<{ address?: string }>;
}

export default async function WalletAddressPage({
  searchParams,
}: WalletAddressPageProps) {
  const { address } = await searchParams;
  return <WalletAddressView initialAddress={address} />;
}
