"use client";

import { useCallback, useEffect, useState } from "react";
import { MAX_LISTED_ORDERS, ORDER_ID_PATTERN } from "@/lib/nimiq/constants";

const storageKey = (address: string) =>
  `jumpa.nimiq.orders.${address.toLowerCase()}`;

function readIds(address: string): string[] {
  try {
    const stored: unknown = JSON.parse(
      localStorage.getItem(storageKey(address)) ?? "[]",
    );
    return Array.isArray(stored)
      ? stored.filter(
          (id): id is string =>
            typeof id === "string" && ORDER_ID_PATTERN.test(id),
        )
      : [];
  } catch {
    return [];
  }
}

function writeIds(address: string, ids: string[]) {
  try {
    localStorage.setItem(storageKey(address), JSON.stringify(ids));
  } catch {
    // Private mode or full storage: the list just won't survive a reload.
  }
}

/** The orders this device started for a wallet, newest first; history reads from it. */
export function useRecentOrders(address?: string) {
  // Read on first render, so history never flashes empty while storage loads.
  const [ids, setIds] = useState<string[]>(() =>
    address ? readIds(address) : [],
  );

  useEffect(() => {
    setIds(address ? readIds(address) : []);
  }, [address]);

  const remember = useCallback(
    (id: string) => {
      if (!address) return;
      const next = [id, ...readIds(address).filter((x) => x !== id)].slice(
        0,
        MAX_LISTED_ORDERS,
      );
      writeIds(address, next);
      setIds(next);
    },
    [address],
  );

  const forget = useCallback(
    (...gone: string[]) => {
      if (!address) return;
      const next = readIds(address).filter((x) => !gone.includes(x));
      writeIds(address, next);
      setIds(next);
    },
    [address],
  );

  return { ids, remember, forget };
}
