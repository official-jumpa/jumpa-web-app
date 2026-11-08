import { formatNaira, formatStable } from "@/lib/naira-deposit";
import { shortenAddress } from "@/lib/transfer";
import type { Transaction } from "@/lib/wallet";
import type { NimiqOrderStatus, PublicOrder } from "./order-status";

/** Orders where nothing moved: an unsigned cash-out, or a top-up nobody paid. */
const HIDDEN: readonly NimiqOrderStatus[] = ["awaiting_signature", "expired"];

const STATUS: Record<NimiqOrderStatus, Transaction["status"]> = {
  awaiting_signature: "pending",
  relaying: "pending",
  awaiting_deposit: "pending",
  processing: "pending",
  completed: "completed",
  failed: "failed",
  expired: "failed",
};

/** The orders worth listing in history, newest first. */
export function visibleHistory(orders: PublicOrder[]): PublicOrder[] {
  return orders
    .filter((order) => !HIDDEN.includes(order.status))
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

/** An order as a row of the shared transaction list. */
export function historyEntry(order: PublicOrder): Transaction {
  const usdt = `${formatStable(order.cryptoAmount)} USDT`;
  const base = {
    id: order.id,
    createdAt: Date.parse(order.createdAt),
    status: STATUS[order.status],
    chain: "polygon",
  };
  if (order.direction === "cash_out") {
    return {
      ...base,
      kind: "send",
      title: `Cash-out to ${order.bank?.accountName ?? "your bank"}`,
      amount: `-${usdt}`,
    };
  }
  if (order.recipientAddress) {
    // The Naira left this user; the USDT went to someone else's wallet.
    return {
      ...base,
      kind: "send",
      title: `Top-up to ${shortenAddress(order.recipientAddress, 6, 4)}`,
      amount: `-${formatNaira(order.fiatAmount)}`,
    };
  }
  return {
    ...base,
    kind: "receive",
    title: "Top-up with Naira",
    amount: `+${usdt}`,
  };
}
