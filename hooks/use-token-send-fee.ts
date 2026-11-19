"use client";

import { useEffect, useState } from "react";
import type { TronTokenSendFee } from "@/lib/chains/tron/sponsor";
import type { NetworkConfig } from "@/lib/transfer";

const TRON_TOKENS = ["USDT", "USDC"];

/** Live fee for a Tron token send to `to`; undefined for other sends or until it loads. */
export function useTokenSendFee(
  chain: NetworkConfig["chain"],
  asset: string,
  to: string,
): TronTokenSendFee | undefined {
  const [fee, setFee] = useState<TronTokenSendFee>();
  const symbol = asset.toUpperCase();
  const applies = chain === "tron" && TRON_TOKENS.includes(symbol);
  // Only a complete address changes the quote, so typing doesn't refetch on every key.
  const recipient = /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(to.trim())
    ? to.trim()
    : "";

  useEffect(() => {
    setFee(undefined);
    if (!applies) return;
    const controller = new AbortController();
    const query = new URLSearchParams({ chain, asset: symbol, to: recipient });
    fetch(`/api/v1/wallet/send/token-fee?${query}`, {
      signal: controller.signal,
    })
      .then((res) => res.json())
      .then((data) => {
        if (data?.success && data.data) setFee(data.data);
      })
      // Without it the screen keeps the static fee label and the server still checks the fee.
      .catch(() => {});
    return () => controller.abort();
  }, [applies, chain, symbol, recipient]);

  return fee;
}
