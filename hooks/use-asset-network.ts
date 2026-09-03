"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { type Chain, chainsFor } from "@/lib/networks";

/** Where the asset's screens live, for one asset on one chain. */
type Destination = (symbol: string, chain: Chain) => string;

/** The deposit address. */
export const depositHref: Destination = (symbol, chain) =>
  `/assets/${symbol.toLowerCase()}/receive?network=${chain.id}`;

/** The wallet screen, scoped to that chain. */
export const walletHref: Destination = (symbol, chain) =>
  `/assets/${symbol.toLowerCase()}?network=${chain.id}`;

/**
 * Ask which chain first whenever the asset lives on more than one — a deposit
 * sent on the wrong network is lost, and a balance only means something on one
 * chain. Single-chain assets go straight through. Consumers render
 * `<NetworkSheet>` while `asking` is set.
 */
export function useAssetNetwork(to: Destination) {
  const router = useRouter();
  const [asking, setAsking] = useState<string>();

  const start = (symbol: string) => {
    const chains = chainsFor(symbol);
    if (chains.length > 1) return setAsking(symbol);
    router.push(to(symbol, chains[0]));
  };

  const choose = (chain: Chain) => {
    if (asking) router.push(to(asking, chain));
    setAsking(undefined);
  };

  return {
    /** Symbol whose network is being picked, or undefined when nothing is. */
    asking,
    chains: asking ? chainsFor(asking) : [],
    start,
    choose,
    cancel: () => setAsking(undefined),
  };
}
