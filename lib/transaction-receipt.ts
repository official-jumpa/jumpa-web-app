import { getAssetLogo } from "@/lib/assets";
import { getCarrierLogo } from "@/lib/bills";
import { FLAGS } from "@/lib/flags";
import type { Receipt } from "@/lib/receipt";
import { formatTxTimestamp, type Transaction } from "@/lib/wallet";

const STATUS_LABEL = {
  completed: "Completed",
  pending: "Pending",
  failed: "Failed",
} as const;

function isNaira(tx: Transaction): boolean {
  return tx.token?.toUpperCase() === "NGN" || tx.chain === "fiat";
}

/** The line under the amount, on screen and on the receipt. */
export function receiptStatus(tx: Transaction): string {
  return tx.heading || "Transaction complete";
}

/** The pill's caption: what kind of movement this was. */
export function receiptLabel(tx: Transaction): string {
  if (tx.kind === "swap") return "Swap";
  if (tx.kind === "bridge") return "Bridge";
  if (tx.kind === "airtime") return "Airtime";
  if (tx.kind === "data") return "Data";
  const offramp = tx.rows?.some((row) => row.label === "Fiat amount");
  if (offramp && tx.kind === "send") return "Naira from Crypto balance";
  if (isNaira(tx))
    return tx.kind === "receive" ? "Naira deposit" : "Naira transfer";
  return "Crypto transfer";
}

/** The pill's disc: the naira flag, the carrier, or the asset's own mark. */
export function receiptMark(tx: Transaction): string | null {
  if (tx.kind === "airtime" || tx.kind === "data") {
    return getCarrierLogo(tx.carrier || tx.title || tx.heading);
  }
  if (isNaira(tx)) return FLAGS.NG;
  return getAssetLogo(tx.token || tx.chain || "");
}

/** "May 26, 2026 | 02:34pm", in the viewer's own clock. */
export function pillDate(ms: number): string {
  const date = new Date(ms);
  if (Number.isNaN(date.getTime())) return "";
  const day = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const time = date
    .toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
    .replace(" ", "")
    .toLowerCase();
  return `${day} | ${time}`;
}

/** The detail screen already holds everything the receipt prints. */
export function toReceipt(tx: Transaction): Receipt {
  const timestamp = tx.createdAt
    ? formatTxTimestamp(tx.createdAt)
    : tx.timestamp || "";
  return {
    reference: tx.displayId || tx.id.replace(/^tx_/i, "").toUpperCase(),
    title: receiptStatus(tx),
    amount: tx.headline || tx.amount,
    status: STATUS_LABEL[tx.status],
    label: receiptLabel(tx),
    mark: receiptMark(tx),
    outcome: tx.status,
    timestamp: tx.createdAt ? pillDate(tx.createdAt) : timestamp,
    rows: (tx.rows ?? []).map((row) => ({
      label: row.label,
      value: row.copy || row.value,
      accent: Boolean(row.link),
    })),
  };
}
