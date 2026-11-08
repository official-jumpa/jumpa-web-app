export type NimiqDirection = "cash_out" | "top_up";

export type NimiqOrderStatus =
  | "awaiting_signature"
  | "relaying"
  | "awaiting_deposit"
  | "processing"
  | "completed"
  | "failed"
  | "expired";

type SwitchDerivedStatus = Extract<
  NimiqOrderStatus,
  "awaiting_deposit" | "processing" | "completed" | "failed"
>;

/** The order as the mini app's client sees it; no full account number, no permit. */
export type PublicOrder = {
  id: string;
  direction: NimiqDirection;
  status: NimiqOrderStatus;
  cryptoAmount: string;
  fiatAmount: number;
  rate: number;
  reference: string;
  createdAt: string;
  /** When the signature (cash-out) or the bank transfer (top-up) stops being accepted. */
  expiresAt?: string;
  /** Top-up only: set when the USDT goes to a wallet other than the connected one. */
  recipientAddress?: string;
  bank?: { name: string; accountName: string; accountNumberMasked: string };
  depositBank?: {
    bankName: string;
    accountName: string;
    accountNumber: string;
    notes: string[];
  };
  transferTxHash?: string;
  explorerUrl?: string;
  failureReason?: string;
};

export const FINAL_STATUSES: readonly NimiqOrderStatus[] = [
  "completed",
  "failed",
  "expired",
];

const IN_FLIGHT_STATUSES: readonly NimiqOrderStatus[] = [
  "relaying",
  "awaiting_deposit",
  "processing",
];

/** Money is moving (or awaited) and the order hasn't settled yet. */
export const isInFlight = (order: Pick<PublicOrder, "status">) =>
  IN_FLIGHT_STATUSES.includes(order.status);

/** Statuses that count toward a wallet's rolling daily limit. */
export const COUNTED_STATUSES: Record<NimiqDirection, NimiqOrderStatus[]> = {
  cash_out: ["relaying", "processing", "completed"],
  top_up: ["awaiting_deposit", "processing", "completed"],
};

const SWITCH_STATUS_MAP: Record<string, SwitchDerivedStatus> = {
  AWAITING_DEPOSIT: "awaiting_deposit",
  INITIATED: "awaiting_deposit",
  PENDING: "awaiting_deposit",
  PROCESSING: "processing",
  IN_PROGRESS: "processing",
  CONFIRMING: "processing",
  COMPLETED: "completed",
  SUCCESS: "completed",
  SUCCESSFUL: "completed",
  DELIVERED: "completed",
  SETTLED: "completed",
  FULFILLED: "completed",
  FAILED: "failed",
  EXPIRED: "failed",
  CANCELLED: "failed",
  REJECTED: "failed",
  REFUNDED: "failed",
};

/** Switch's status word → the mini app's order status; null when unknown. */
export function fromSwitchStatus(raw: string): SwitchDerivedStatus | null {
  return SWITCH_STATUS_MAP[raw.trim().toUpperCase()] ?? null;
}
