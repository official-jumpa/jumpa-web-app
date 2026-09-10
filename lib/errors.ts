/**
 * Failures reach the UI as raw provider strings — the vault client throws
 * `[DeFindex POST /vault/deposit] Failed (403): Forbidden`, Horizon answers
 * with `op_underfunded`, fetch throws "Load failed". None of that means
 * anything to the person who just entered their PIN, so it is mapped to plain
 * copy here and the raw text goes to the console for whoever is debugging.
 *
 * Every message says the money is still in the wallet — that is the first
 * thing anyone wants to know after a failed transaction.
 */

export type FriendlyError = {
  title: string;
  message: string;
  /** False when trying again cannot help — a missing config, a dead account. */
  retry: boolean;
};

/** What the user was doing, so the copy can name it. */
export type ErrorSubject =
  | "transaction"
  | "transfer"
  | "swap"
  | "deposit"
  | "withdrawal";

const OFFLINE: FriendlyError = {
  title: "You're offline",
  message:
    "We couldn't reach Jumpa. Check your connection and try again — nothing left your wallet.",
  retry: true,
};

const UNAVAILABLE: FriendlyError = {
  title: "Jumpa is busy",
  message:
    "Our provider didn't respond just now. Nothing left your wallet — please try again in a few minutes.",
  retry: true,
};

const SESSION: FriendlyError = {
  title: "Session expired",
  message: "Sign in again to carry on. Nothing left your wallet.",
  retry: false,
};

const UNKNOWN: FriendlyError = {
  title: "That didn't go through",
  message:
    "Something went wrong on our side and the transaction was not completed. Nothing left your wallet.",
  retry: true,
};

/** A fetch that never reached us — the browser's own wording, per engine. */
const OFFLINE_PHRASES = ["failed to fetch", "networkerror", "load failed"];

/**
 * Underfunded, in every wording it can arrive in: our own guard, Horizon's
 * result codes, and the vault rejecting the transfer it was asked to build.
 */
const UNDERFUNDED = [
  "insufficient",
  "not enough",
  "underfunded",
  "op_underfunded",
  "tx_insufficient_balance",
  "op_low_reserve",
  "balance is too low",
  "resulting balance",
  "allowed range",
  "error(contract, #10)",
  "contract, #10",
  "insufficient balance",
];

/** No trustline — the account cannot hold the asset at all yet. */
const NO_TRUST = [
  "op_no_trust",
  "no_trust",
  "trustline",
  "does not trust",
  "error(contract, #13)",
  "contract, #13",
];

/** The account does not exist on the ledger, or the destination does not. */
const INACTIVE = [
  "not activated",
  "op_no_destination",
  "not found on ledger",
  "minimum reserve",
];

/** The price we quoted is no longer the price on offer. */
const STALE_QUOTE = [
  "slippage",
  "quote expired",
  "price moved",
  "tx_too_late",
  "deadline",
];

/** Provider-speak, never shown even when it reads like a sentence. */
const MACHINE = ["status code", "failed (", "http", "econn", "fetch", "["];

const has = (text: string, needle: string) => text.includes(needle);
const any = (text: string, list: string[]) =>
  list.some((phrase) => has(text, phrase));

/**
 * Our own API routes write sentences for the user ("Your Stellar testnet
 * account is not activated…"); providers write tags and result codes. Showing
 * the first is always better than any copy we could substitute for it.
 */
function readsAsCopy(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    text.length > 24 &&
    /^[A-Z]/.test(text) &&
    /[.!]$/.test(text) &&
    !/\b[a-z]+_[a-z]+\b/.test(lower) &&
    !any(lower, MACHINE)
  );
}

/** The message off whatever a `catch` was handed, without reaching for `any`. */
export function errorMessage(err: unknown): string | undefined {
  if (err instanceof Error) return err.message;
  return typeof err === "string" ? err : undefined;
}

export function friendlyError(
  raw?: string | null,
  subject: ErrorSubject = "transaction",
): FriendlyError {
  const text = (raw ?? "").trim();
  if (text) console.error("[jumpa]", text);
  if (!text) return UNKNOWN;

  const lower = text.toLowerCase();

  if (any(lower, OFFLINE_PHRASES)) return OFFLINE;

  if (has(lower, "vault address not configured")) {
    return {
      title: "Savings isn't ready yet",
      message:
        "This savings product isn't switched on for your account. Nothing left your wallet.",
      retry: false,
    };
  }

  // Five wrong PINs locks the wallet for 15 minutes. That is not a mistyped
  // PIN, and the server sentence carries the time left, so it is shown as-is.
  if (has(lower, "pin attempts") || has(lower, "wallet is locked")) {
    return {
      title: "Too many PIN attempts",
      message: readsAsCopy(text)
        ? text
        : "This wallet locks for a few minutes after five incorrect PINs. Nothing left your wallet.",
      retry: false,
    };
  }

  if (has(lower, "unauthorized") || has(lower, "session expired")) {
    return SESSION;
  }

  if (has(lower, "wallet not found") || has(lower, "no wallet found")) {
    return {
      title: "We couldn't find your wallet",
      message:
        "This wallet isn't available right now. Sign in again to carry on — nothing left your wallet.",
      retry: false,
    };
  }

  if (has(lower, "decrypt wallet") || has(lower, "decrypt")) {
    return {
      title: "We couldn't unlock your wallet",
      message:
        "Your PIN didn't unlock the wallet. Check it and try again — nothing left your wallet.",
      retry: true,
    };
  }

  // Checked before the generic buckets: a 403 from a provider on an
  // underfunded deposit would otherwise land in "Jumpa is busy" and say
  // nothing the user can act on.
  if (any(lower, UNDERFUNDED)) {
    return {
      title: "Not enough balance",
      message: readsAsCopy(text)
        ? text
        : `Your wallet doesn't hold enough for this ${subject}. Add funds or lower the amount, then try again.`,
      retry: false,
    };
  }

  if (any(lower, INACTIVE)) {
    return {
      title: "That account isn't active yet",
      message: readsAsCopy(text)
        ? text
        : "A Stellar account needs a small starting balance before it can send or receive. Fund it, then try again.",
      retry: false,
    };
  }

  if (any(lower, NO_TRUST)) {
    return {
      title: "That asset isn't accepted yet",
      message: readsAsCopy(text)
        ? text
        : "The account has no trustline for this asset, so it cannot hold it. Nothing left your wallet.",
      retry: false,
    };
  }

  if (any(lower, STALE_QUOTE)) {
    return {
      title: "The price moved",
      message: `Your quote is no longer valid, so the ${subject} was not completed. Nothing left your wallet — get a fresh quote and try again.`,
      retry: true,
    };
  }

  if (has(lower, "not found")) {
    return {
      title: "We couldn't find that",
      message:
        "It is no longer available. Go back and pick it again — nothing left your wallet.",
      retry: false,
    };
  }

  // Anything a provider client threw, whatever the status on it.
  if (has(text, "DeFindex") || has(lower, "broadcast failed")) {
    return UNAVAILABLE;
  }

  const status = Number(/\((\d{3})\)/.exec(text)?.[1]);
  if (status >= 500) return UNAVAILABLE;
  if (status === 401 || status === 403) return SESSION;

  // Last resort: a sentence the server already wrote beats our generic copy.
  if (readsAsCopy(text)) {
    return { title: "That didn't go through", message: text, retry: false };
  }

  return UNKNOWN;
}
