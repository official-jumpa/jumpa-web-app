import { unifyTokens } from "@/lib/assets";
import { type Asset, SUPPORTED_ASSETS } from "@/lib/wallet";
import { getCachedWalletBalances } from "@/lib/wallet-balances";

/**
 * Every supported wallet, carrying the USD value of what the user actually
 * holds. The list never shrinks — an untouched wallet still shows its row.
 */
export async function walletAssets(userId?: string): Promise<Asset[]> {
  if (!userId) return SUPPORTED_ASSETS;

  const balances = await getCachedWalletBalances(userId).catch(() => null);
  if (!balances?.tokens?.length) return SUPPORTED_ASSETS;

  // unifyTokens sums a symbol across chains, which is what one row stands for.
  const held = new Map(
    unifyTokens(balances.tokens).map((unified) => [
      unified.symbol.toUpperCase(),
      unified,
    ]),
  );

  return SUPPORTED_ASSETS.map((asset) => {
    const unified = held.get(asset.symbol.toUpperCase());
    return unified
      ? {
          ...asset,
          balance: unified.balance,
          change: unified.change,
        }
      : asset;
  });
}
