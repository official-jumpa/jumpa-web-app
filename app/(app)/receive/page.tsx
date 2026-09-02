import type { Metadata } from "next";
import { AssetPicker } from "@/components/assets/asset-picker";
import { ASSETS } from "@/lib/wallet";

export const metadata: Metadata = { title: "Receive" };

/** Pick the wallet to be paid into; multi-chain assets ask for the network next. */
export default function ReceivePage() {
  return <AssetPicker assets={ASSETS} receive />;
}
