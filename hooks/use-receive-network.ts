"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { type Chain, chainsFor } from "@/lib/networks";

/** Where a deposit address lives, for one asset on one chain. */
function depositHref(symbol: string, chain: Chain) {
  return `/assets/${symbol.toLowerCase()}/receive?network=${chain.id}`;
}

/**
 * Receive asks which chain first whenever the asset lives on more than one —
 * a deposit sent on the wrong network is lost. Single-chain assets go straight
 * through. Consumers render `<NetworkSheet>` while `asking` is set.
 */
export function useReceiveNetwork() {
  const router = useRouter();
  const [asking, setAsking] = useState<string>();

  const start = (symbol: string) => {
    const chains = chainsFor(symbol);
    if (chains.length > 1) return setAsking(symbol);
    router.push(depositHref(symbol, chains[0]));
  };

  const choose = (chain: Chain) => {
    if (asking) router.push(depositHref(asking, chain));
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
