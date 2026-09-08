import type { Metadata } from "next";
import { WalletAddressView } from "@/components/send/wallet-address-view";

export const metadata: Metadata = { title: "Wallet address" };

export default function WalletAddressPage() {
  return <WalletAddressView />;
}
