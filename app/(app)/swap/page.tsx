import type { Metadata } from "next";
import { SwapView } from "@/components/swap/swap-view";
import { PROMOTIONS } from "@/lib/wallet";
import { getSession } from "@/lib/session";
import { fetchStellarBalances } from "@/lib/chains/stellar";

export const metadata: Metadata = { title: "Swap" };

export default async function SwapPage() {
  // Pre-fetch Stellar testnet balances server-side so the initial render
  // shows real numbers without a client-side waterfall fetch.
  let stellarTestnetBalances = { xlm: "0.00", usdc: "0.00" };

  try {
    const session = await getSession();
    const xlmAddress = session?.addresses?.xlm;

    if (xlmAddress) {
      const result = await fetchStellarBalances(xlmAddress);
      stellarTestnetBalances = {
        xlm: result.testnet.native,
        usdc: result.testnet.usdc,
      };
    }
  } catch {
    // Non-fatal — swap view will show 0.00 and live quote still works
  }

  return (
    <SwapView
      promotions={PROMOTIONS}
      stellarTestnetBalances={stellarTestnetBalances}
    />
  );
}
