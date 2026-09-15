import type { Metadata } from "next";
import { SwapView } from "@/components/swap/swap-view";
import { getCachedAuthSession } from "@/lib/functions/permissionFunctions";
import { findWalletForUser } from "@/lib/functions/walletFunctions";
import { fetchStellarBalances } from "@/lib/chains/stellar";

export const metadata: Metadata = { title: "Swap" };

export default async function SwapPage() {
  // Pre-fetch Stellar testnet balances server-side so the initial render
  // shows real numbers without a client-side waterfall fetch.
  let stellarTestnetBalances = { xlm: "0.00", usdc: "0.00" };

  try {
    const session = await getCachedAuthSession();
    if (session?.user?.id) {
      const wallet = await findWalletForUser(session.user.id);
      const xlmAddress = wallet?.addresses?.xlm || wallet?.address;

      if (xlmAddress) {
        const result = await fetchStellarBalances(xlmAddress);
        stellarTestnetBalances = {
          xlm: result.testnet.native,
          usdc: result.testnet.usdc,
        };
      }
    }
  } catch (err) {
    console.warn("[SwapPage SSR]", err);
  }

  return <SwapView stellarTestnetBalances={stellarTestnetBalances} />;
}
