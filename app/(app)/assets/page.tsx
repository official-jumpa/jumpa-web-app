import type { Metadata } from "next";
import { AssetPicker } from "@/components/assets/asset-picker";
import { SUPPORTED_ASSETS } from "@/lib/wallet";

export const metadata: Metadata = { title: "All Wallets" };

export default function AssetsPage() {
  return <AssetPicker assets={SUPPORTED_ASSETS} />;
}
