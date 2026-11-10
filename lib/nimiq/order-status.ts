/** Switch's two ramps; quotes and the top-up limit hold only apply to these. */
export type RampDirection = "cash_out" | "top_up";

/** Airtime and data are bought with USDT the user moves to Jumpa. */
export type BillDirection = "airtime" | "data";

/** USDT moved from the user's wallet straight to another Polygon wallet. */
export type SendDirection = "send";

export type NimiqDirection = RampDirection | BillDirection | SendDirection;

export const isBillDirection = (
  direction: NimiqDirection,
): direction is BillDirection =>
  direction === "airtime" || direction === "data";

export type NimiqOrderStatus =
  | "awaiting_signature"
  | "relaying"
  | "awaiting_deposit"
  | "processing"
  | "completed"
  | "failed"
  | "expired"
  | "cancelled"
  /** Bill only: the network refused it and the USDT is going back. */
  | "refunding"
  | "refunded";

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
  /** Top-up: set when the USDT goes to a wallet other than the connected one. Send: always the recipient. */
  recipientAddress?: string;
  bank?: { name: string; accountName: string; accountNumberMasked: string };
  depositBank?: {
    bankName: string;
    accountName: string;
    accountNumber: string;
    notes: string[];
  };
  /** Airtime and data only: who was topped up and with what. */
  bill?: { phone: string; network: string; size?: string; validity?: string };
  transferTxHash?: string;
  explorerUrl?: string;
  /** Bill only: the transaction that returned the USDT. */
  refundUrl?: string;
  failureReason?: string;
};

export const FINAL_STATUSES: readonly NimiqOrderStatus[] = [
  "completed",
  "failed",
  "expired",
  "cancelled",
  "refunded",
];

const IN_FLIGHT_STATUSES: readonly NimiqOrderStatus[] = [
  "relaying",
  "awaiting_deposit",
  "processing",
  "refunding",
];

/** Money is moving (or awaited) and the order hasn't settled yet. */
export const isInFlight = (order: Pick<PublicOrder, "status">) =>
  IN_FLIGHT_STATUSES.includes(order.status);

/** Statuses that count toward a wallet's rolling daily limit. */
export const COUNTED_STATUSES: Record<NimiqDirection, NimiqOrderStatus[]> = {
  cash_out: ["relaying", "processing", "completed"],
  top_up: ["awaiting_deposit", "processing", "completed"],
  airtime: ["relaying", "processing", "completed"],
  data: ["relaying", "processing", "completed"],
  send: ["relaying", "processing", "completed"],
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
