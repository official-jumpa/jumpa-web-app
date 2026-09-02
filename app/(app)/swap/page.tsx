import type { Metadata } from "next";
import { SwapView } from "@/components/swap/swap-view";
import { PROMOTIONS } from "@/lib/wallet";

export const metadata: Metadata = { title: "Swap" };

export default function SwapPage() {
  return <SwapView promotions={PROMOTIONS} />;
}
