/**
 * Savings failures reach the UI as raw provider strings — the vault client
 * throws `[DeFindex POST /vault/deposit] Failed (403): Forbidden` and the route
 * passes it straight through. None of that means anything to the person who
 * just entered their PIN, so it is mapped to plain copy here and the raw text
 * goes to the console for whoever is debugging.
 */

export type SavingsError = {
  title: string;
  message: string;
  /** False when trying again cannot help — a missing config, a locked plan. */
  retry: boolean;
};

const OFFLINE: SavingsError = {
  title: "You're offline",
  message:
    "We couldn't reach Jumpa. Check your connection and try again — nothing left your wallet.",
  retry: true,
};

const UNAVAILABLE: SavingsError = {
  title: "Savings is busy",
  message:
    "The savings vault didn't respond just now. Nothing left your wallet — please try again in a few minutes.",
  retry: true,
};

const UNKNOWN: SavingsError = {
  title: "That didn't go through",
  message:
    "Something went wrong on our side and the transaction was not completed. Nothing left your wallet.",
  retry: true,
};

/** Server sentences that are already written for the user; shown as they are. */
const PASS_THROUGH = ["exceeds plan balance", "cannot be topped up"];

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
];

/** No USDC trustline — the account cannot hold the asset at all yet. */
const NO_TRUST = ["op_no_trust", "no_trust", "trustline"];

const has = (text: string, needle: string) => text.includes(needle);

export function friendlySavingsError(raw?: string | null): SavingsError {
  const text = (raw ?? "").trim();
  if (text) console.error("[savings]", text);
  if (!text) return UNKNOWN;

  const lower = text.toLowerCase();

  // A fetch that never reached us — the browser's own message.
  if (
    has(lower, "failed to fetch") ||
    has(lower, "networkerror") ||
    has(lower, "load failed")
  ) {
    return OFFLINE;
  }

  if (has(lower, "vault address not configured")) {
    return {
      title: "Savings isn't ready yet",
      message:
        "This savings product isn't switched on for your account. Nothing left your wallet.",
      retry: false,
    };
  }

  if (has(lower, "decrypt wallet")) {
    return {
      title: "We couldn't unlock your wallet",
      message:
        "Your PIN didn't unlock the wallet. Check it and try again — nothing left your wallet.",
      retry: true,
    };
  }

  if (has(lower, "not found")) {
    return {
      title: "We couldn't find that plan",
      message:
        "This savings plan is no longer available. Go back and pick it again.",
      retry: false,
    };
  }

  // Checked before the generic buckets: a 403 from the vault on an underfunded
  // deposit would otherwise land in "Savings is busy" and say nothing useful.
  if (UNDERFUNDED.some((phrase) => has(lower, phrase))) {
    return {
      title: "Not enough balance",
      message: text.startsWith("Insufficient")
        ? text
        : "Your wallet doesn't hold enough USDC for this deposit. Add funds or lower the amount, then try again.",
      retry: false,
    };
  }

  if (NO_TRUST.some((phrase) => has(lower, phrase))) {
    return {
      title: "Your wallet can't hold USDC yet",
      message:
        "This wallet has no USDC trustline on Stellar. Receive a little USDC first, then set the plan up again.",
      retry: false,
    };
  }

  for (const phrase of PASS_THROUGH) {
    if (has(lower, phrase)) {
      return { title: "That didn't go through", message: text, retry: false };
    }
  }

  // Anything the vault client threw, whatever the status on it.
  if (has(text, "DeFindex") || has(lower, "broadcast failed")) {
    return UNAVAILABLE;
  }

  const status = Number(/\((\d{3})\)/.exec(text)?.[1]);
  if (status >= 500) return UNAVAILABLE;
  if (status === 401 || status === 403) {
    return {
      title: "Session expired",
      message: "Sign in again to carry on. Nothing left your wallet.",
      retry: false,
    };
  }

  return UNKNOWN;
}
