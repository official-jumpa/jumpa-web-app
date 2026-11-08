import type { PublicOrder } from "./order-status";

/** Whether this order changes the connected wallet's own USDT balance by now. */
export function movesOwnBalance(order: PublicOrder): boolean {
  if (order.direction === "cash_out") {
    return order.status === "processing" || order.status === "completed";
  }
  return order.status === "completed" && !order.recipientAddress;
}

/** True when an order watched while pending (`wasMoving` false) has just moved the balance. */
export function isBalanceMove(
  wasMoving: boolean | undefined,
  order: PublicOrder,
): boolean {
  return wasMoving === false && movesOwnBalance(order);
}

/**
 * Re-reads until the value differs from `before` or `timeoutMs` passes, since a
 * finished order can land on chain a few seconds after it reports done.
 */
export async function waitForChange<T>(
  read: () => Promise<T>,
  before: T,
  {
    intervalMs = 3_000,
    timeoutMs = 30_000,
    signal,
  }: { intervalMs?: number; timeoutMs?: number; signal?: AbortSignal } = {},
): Promise<T> {
  const giveUpAt = Date.now() + timeoutMs;
  let last = before;
  while (!signal?.aborted) {
    try {
      last = await read();
      if (last !== before) return last;
    } catch {
      // A failed read is the same lag; keep checking.
    }
    if (Date.now() >= giveUpAt) break;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  return last;
}
