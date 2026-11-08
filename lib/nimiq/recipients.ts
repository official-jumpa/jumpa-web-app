import { getAddress, isAddress, isAddressEqual, zeroAddress } from "viem";
import { POLYGON_USDT } from "./constants";

/** How many recent bank accounts and wallets a device keeps per Nimiq Pay wallet. */
export const MAX_SAVED = 5;

/** A bank account a cash-out was sent to; `bank` is the picker's name, re-verified on use. */
export type SavedBank = {
  accountNumber: string;
  bank: string;
  accountName: string;
  bankName: string;
};

export type SavedRecipients = { banks: SavedBank[]; wallets: string[] };

const ACCOUNT_NUMBER = /^\d{10}$/;

/** Addresses that accept a transfer but nobody can spend from. */
const BURN_ADDRESSES = [zeroAddress, POLYGON_USDT.address];

const sameBank = (a: SavedBank, b: SavedBank) =>
  a.accountNumber === b.accountNumber && a.bank === b.bank;

/** Puts `entry` first, drops its older copy and keeps the newest `MAX_SAVED`. */
export function rememberBank(list: SavedBank[], entry: SavedBank): SavedBank[] {
  return [entry, ...list.filter((saved) => !sameBank(saved, entry))].slice(
    0,
    MAX_SAVED,
  );
}

/** Same as `rememberBank` for wallet addresses, compared case-insensitively. */
export function rememberWallet(list: string[], address: string): string[] {
  const entry = getAddress(address);
  return [entry, ...list.filter((saved) => saved !== entry)].slice(
    0,
    MAX_SAVED,
  );
}

function isSavedBank(value: unknown): value is SavedBank {
  const entry = value as Partial<SavedBank> | null;
  return (
    typeof entry?.accountNumber === "string" &&
    ACCOUNT_NUMBER.test(entry.accountNumber) &&
    typeof entry.bank === "string" &&
    entry.bank.length > 0 &&
    typeof entry.accountName === "string" &&
    typeof entry.bankName === "string"
  );
}

/** Reads stored recipients, keeping only well-formed entries. */
export function parseSaved(raw: string | null): SavedRecipients {
  let stored: Partial<Record<keyof SavedRecipients, unknown>> | null = null;
  try {
    stored = raw ? JSON.parse(raw) : null;
  } catch {
    // Unreadable storage counts as empty.
  }
  const banks = Array.isArray(stored?.banks) ? stored.banks : [];
  const wallets = Array.isArray(stored?.wallets) ? stored.wallets : [];
  return {
    banks: banks
      .filter(isSavedBank)
      .map(({ accountNumber, bank, accountName, bankName }) => ({
        accountNumber,
        bank,
        accountName,
        bankName,
      }))
      .slice(0, MAX_SAVED),
    wallets: wallets
      .filter(
        (entry): entry is string =>
          typeof entry === "string" && isAddress(entry),
      )
      .map((entry) => getAddress(entry))
      .slice(0, MAX_SAVED),
  };
}

/** Why `value` can't receive a top-up, or undefined when it can. */
export function walletAddressError(value: string): string | undefined {
  const address = value.trim();
  if (!address) return "Enter a wallet address.";
  if (!isAddress(address)) return "Enter a valid Polygon address.";
  if (BURN_ADDRESSES.some((burn) => isAddressEqual(burn, address))) {
    return "This address can't receive USDT.";
  }
  return undefined;
}
