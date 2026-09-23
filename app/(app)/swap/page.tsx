import type { Metadata } from "next";
import { SwapView } from "@/components/swap/swap-view";
import { getCachedAuthSession } from "@/lib/functions/permissionFunctions";
import { getCachedWalletBalances } from "@/lib/wallet-balances";

export const metadata: Metadata = { title: "Swap" };

export default async function SwapPage() {
  let stellarBalances = { xlm: "0.00", usdc: "0.00" };

  try {
    const session = await getCachedAuthSession();
    if (session?.user?.id) {
      const balances = await getCachedWalletBalances(session.user.id);
      if (balances?.tokens) {
        const xlmToken = balances.tokens.find(
          (t) => t.symbol === "XLM" && !t.isTestnet,
        );
        const usdcToken = balances.tokens.find(
          (t) => t.symbol === "USDC" && !t.isTestnet,
        );
        stellarBalances = {
          xlm: xlmToken?.balance || "0.00",
          usdc: usdcToken?.balance || "0.00",
        };
      }
    }
  } catch (err) {
    console.warn("[SwapPage SSR]", err);
  }

  return <SwapView stellarBalances={stellarBalances} />;
}
