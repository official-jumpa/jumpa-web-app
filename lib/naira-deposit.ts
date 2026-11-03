/**
 * Deposit Naira: pay naira into a one-off bank account, receive a stablecoin.
 * Chains mirror `SUPPORTED_SWITCH_ASSETS` in lib/switch.ts, the provider the
 * on-ramp route calls; keep the two in step.
 */
export const NAIRA_TOKENS = ["USDC", "USDT"] as const;
export type NairaToken = (typeof NAIRA_TOKENS)[number];

/** Switch takes USDC on Tron for off-ramp only; it rejects it as an on-ramp asset. */
export const ONRAMP_CHAINS: Record<NairaToken, string[]> = {
  USDC: ["base", "solana", "ethereum"],
  USDT: ["solana", "ethereum", "tron"],
};

/** Listed as coming soon: Stellar settles through a provider the route does not call yet. */
export const ONRAMP_SOON_CHAINS = ["stellar"];

export function isNairaToken(value?: string | null): value is NairaToken {
  return NAIRA_TOKENS.includes(value as NairaToken);
}

/** The provider's bank account for one deposit, and what it buys. */
export type OnrampOrder = {
  reference: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  cryptoAmount: number | string;
  fiatAmount: number;
  /** The provider's instructions for this transfer, e.g. how long the account stays open. */
  notes?: string[];
};

export type DepositState = "awaiting" | "processing" | "completed" | "failed";

/** `/api/v1/exchange/status` flags, reduced to the one state the screen draws. */
export function toDepositState(data: {
  isCompleted?: boolean;
  isProcessing?: boolean;
  isFailed?: boolean;
}): DepositState {
  if (data.isCompleted) return "completed";
  if (data.isFailed) return "failed";
  if (data.isProcessing) return "processing";
  return "awaiting";
}

export function formatNaira(amount: number): string {
  return `₦${amount.toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatStable(amount: number | string): string {
  return Number(amount).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
