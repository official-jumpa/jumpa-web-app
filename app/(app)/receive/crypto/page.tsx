import type { Metadata } from "next";
import { AssetPicker } from "@/components/assets/asset-picker";
import { SUPPORTED_ASSETS } from "@/lib/wallet";

export const metadata: Metadata = { title: "Deposit Crypto" };

/** Pick the wallet to be paid into; multi-chain assets ask for the network next. */
export default function DepositCryptoPage() {
  return <AssetPicker assets={SUPPORTED_ASSETS} receive back="/receive" />;
}
