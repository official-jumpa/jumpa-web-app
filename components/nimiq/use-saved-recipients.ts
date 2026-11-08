"use client";

import { useCallback, useEffect, useState } from "react";
import {
  parseSaved,
  rememberBank,
  rememberWallet,
  type SavedBank,
  type SavedRecipients,
} from "@/lib/nimiq/recipients";

const EMPTY: SavedRecipients = { banks: [], wallets: [] };

const storageKey = (address: string) =>
  `jumpa.nimiq.recipients.${address.toLowerCase()}`;

function read(address: string): SavedRecipients {
  try {
    return parseSaved(localStorage.getItem(storageKey(address)));
  } catch {
    return EMPTY;
  }
}

function write(address: string, saved: SavedRecipients) {
  try {
    localStorage.setItem(storageKey(address), JSON.stringify(saved));
  } catch {
    // Private mode or full storage: the list just won't survive a reload.
  }
}

/** Bank accounts and wallets this device has paid from a Nimiq Pay wallet, newest first. */
export function useSavedRecipients(address?: string) {
  const [saved, setSaved] = useState<SavedRecipients>(() =>
    address ? read(address) : EMPTY,
  );

  useEffect(() => {
    setSaved(address ? read(address) : EMPTY);
  }, [address]);

  const update = useCallback(
    (change: (current: SavedRecipients) => SavedRecipients) => {
      if (!address) return;
      const next = change(read(address));
      write(address, next);
      setSaved(next);
    },
    [address],
  );

  const saveBank = useCallback(
    (bank: SavedBank) =>
      update((current) => ({
        ...current,
        banks: rememberBank(current.banks, bank),
      })),
    [update],
  );

  const saveWallet = useCallback(
    (wallet: string) =>
      update((current) => ({
        ...current,
        wallets: rememberWallet(current.wallets, wallet),
      })),
    [update],
  );

  return { ...saved, saveBank, saveWallet };
}
