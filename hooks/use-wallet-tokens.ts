import { useCallback, useEffect, useState } from "react";
import { onBalanceRefresh } from "@/lib/client-events";

export interface WalletToken {
  symbol: string;
  balance: number;
  /** What can actually move: below `balance` for XLM, which keeps a reserve. */
  spendable: number;
  priceUsd: number;
  network: string;
}

/** Mainnet holdings straight off `/api/v1/wallet`, refreshed after any send. */
export function useWalletTokens() {
  const [tokens, setTokens] = useState<WalletToken[]>([]);
  const [ready, setReady] = useState(false);

  const load = useCallback(async (refresh = false) => {
    try {
      const res = await fetch(
        `/api/v1/wallet?fields=balance${refresh ? "&refresh=true" : ""}`,
        { cache: "no-store" },
      );
      if (!res.ok) return;
      const json = await res.json();
      const list: {
        symbol?: string;
        balance?: string;
        spendable?: string;
        priceUsd?: string;
        network?: string;
        isTestnet?: boolean;
      }[] = json.data?.tokens ?? [];
      setTokens(
        list
          .filter((t) => t.symbol && !t.isTestnet)
          .map((t) => {
            const balance = Number.parseFloat(t.balance ?? "") || 0;
            return {
              symbol: String(t.symbol).toUpperCase(),
              balance,
              spendable: t.spendable ? Number.parseFloat(t.spendable) || 0 : balance,
              priceUsd: Number.parseFloat(t.priceUsd ?? "") || 0,
              network: (t.network ?? "").toLowerCase(),
            };
          }),
      );
      setReady(true);
    } catch (err) {
      console.error("[wallet tokens]", err);
    }
  }, []);

  useEffect(() => {
    load();
    return onBalanceRefresh(() => load(true));
  }, [load]);

  return { tokens, ready };
}

/** The holding that pays for `token` on `chain`; chain keys match `NETWORK_CONFIGS`. */
export function findHolding(
  tokens: WalletToken[],
  token: string,
  chain: string,
): WalletToken | undefined {
  return tokens.find((t) => t.symbol === token && t.network.includes(chain));
}
