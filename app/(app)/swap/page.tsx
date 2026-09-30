import type { Metadata } from "next";
import { createPublicClient, http, erc20Abi, formatUnits } from "viem";
import { mainnet, base } from "viem/chains";
import { SwapView } from "@/components/swap/swap-view";
import { getCachedAuthSession } from "@/lib/functions/permissionFunctions";
import { getCachedWalletBalances } from "@/lib/wallet-balances";
import { CONTRACT_ADDRESSES, getRpcUrl } from "@/lib/blockchain";

export const metadata: Metadata = { title: "Swap" };

export default async function SwapPage() {
  let stellarBalances = { xlm: "0.00", usdc: "0.00" };
  let bridgeBalances = {
    stellarUsdc: "0.00",
    baseUsdc: "0.00",
    ethereumUsdc: "0.00",
  };
  let walletAddresses = {
    stellar: "",
    base: "",
    ethereum: "",
  };

  try {
    const session = await getCachedAuthSession();
    if (session?.user?.id) {
      const balances = await getCachedWalletBalances(session.user.id);
      if (balances?.addresses) {
        walletAddresses = {
          stellar: balances.addresses.xlm || "",
          base: balances.addresses.base || "",
          ethereum: balances.addresses.eth || balances.addresses.base || "",
        };
      }
      if (balances?.tokens) {
        const xlmToken = balances.tokens.find(
          (t) => t.symbol === "XLM" && !t.isTestnet,
        );
        const usdcToken = balances.tokens.find(
          (t) => t.symbol === "USDC" && !t.isTestnet && t.network?.toLowerCase().includes("stellar"),
        );
        stellarBalances = {
          xlm: xlmToken?.balance || "0.00",
          usdc: usdcToken?.balance || "0.00",
        };

        const mainnetStellarUsdc = usdcToken?.balance || "0.00";
        const mainnetBaseToken = balances.tokens.find(
          (t) =>
            t.symbol === "USDC" &&
            !t.isTestnet &&
            t.network?.toLowerCase().includes("base"),
        );

        let ethUsdc = "0.00";
        let baseUsdc = mainnetBaseToken?.balance || "0.00";

        // Query on-chain mainnet USDC for EVM if address exists
        if (walletAddresses.ethereum) {
          try {
            const ethClient = createPublicClient({
              chain: mainnet,
              transport: http(getRpcUrl("ethereum")),
            });
            const bal = await ethClient.readContract({
              address: CONTRACT_ADDRESSES.cctp.mainnet.ethereum.usdc,
              abi: erc20Abi,
              functionName: "balanceOf",
              args: [walletAddresses.ethereum as `0x${string}`],
            });
            ethUsdc = formatUnits(bal, 6);
          } catch {}
        }

        bridgeBalances = {
          stellarUsdc: mainnetStellarUsdc,
          baseUsdc,
          ethereumUsdc: ethUsdc,
        };
      }
    }
  } catch (err) {
    console.warn("[SwapPage SSR]", err);
  }

  return (
    <SwapView
      stellarBalances={stellarBalances}
      bridgeBalances={bridgeBalances}
      walletAddresses={walletAddresses}
    />
  );
}
