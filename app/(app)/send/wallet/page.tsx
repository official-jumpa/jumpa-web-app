import type { Metadata } from "next";
import { WalletAddressView } from "@/components/send/wallet-address-view";
import { PROMOTIONS } from "@/lib/wallet";

export const metadata: Metadata = { title: "Wallet address" };

export default function WalletAddressPage() {
  return <WalletAddressView promotions={PROMOTIONS} />;
}
