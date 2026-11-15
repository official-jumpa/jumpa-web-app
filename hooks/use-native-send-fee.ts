"use client";

import { useEffect, useState } from "react";
import type { NativeSendFee } from "@/lib/chains/native-fee";
import { NATIVE_COIN, type NetworkConfig } from "@/lib/transfer";

/** Live fee for sending `asset` on `chain` when it's the chain's own coin; undefined otherwise or until it loads. */
export function useNativeSendFee(
  chain: NetworkConfig["chain"],
  asset: string,
): NativeSendFee | undefined {
  const [fee, setFee] = useState<NativeSendFee>();
  const native = NATIVE_COIN[chain] === asset.toUpperCase();

  useEffect(() => {
    setFee(undefined);
    if (!native) return;
    const controller = new AbortController();
    fetch(`/api/v1/wallet/send/fee?chain=${chain}`, {
      signal: controller.signal,
    })
      .then((res) => res.json())
      .then((data) => {
        if (data?.success) {
          setFee({ fee: Number(data.fee), holdback: Number(data.holdback) });
        }
      })
      // Without it the screen keeps the static fee label and the server still checks the gas.
      .catch(() => {});
    return () => controller.abort();
  }, [chain, native]);

  return fee;
}
