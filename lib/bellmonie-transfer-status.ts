import type { ITransaction } from "@/models/Transaction";

/** Bellmonie statuses that mean the payout reached the beneficiary. */
const SENT_STATUSES = new Set(["successful", "success"]);
/** Bellmonie statuses that mean the payout did not go through. */
const FAILED_STATUSES = new Set(["failed", "reversed", "rejected", "declined"]);
/** Bellmonie statuses known to mean the payout is still on its way. */
const IN_FLIGHT_STATUSES = new Set([
  "pending",
  "processing",
  "initiated",
  "queued",
  "in_progress",
]);

const normalise = (status: unknown) => String(status ?? "").toLowerCase();

export const isSentStatus = (status: unknown) =>
  SENT_STATUSES.has(normalise(status));
export const isFailedStatus = (status: unknown) =>
  FAILED_STATUSES.has(normalise(status));

export type TransferRecordStatus = Extract<
  ITransaction["status"],
  "CONFIRMED" | "PENDING" | "FAILED"
>;

/** How a naira payout is recorded. Anything Bellmonie has not called sent or failed is still processing. */
export function recordStatusFor(status: unknown): TransferRecordStatus {
  if (isSentStatus(status)) return "CONFIRMED";
  if (isFailedStatus(status)) return "FAILED";
  if (!IN_FLIGHT_STATUSES.has(normalise(status))) {
    console.warn(
      `[Bellmonie] Unrecognised transfer status "${status}", recorded as pending.`,
    );
  }
  return "PENDING";
}
