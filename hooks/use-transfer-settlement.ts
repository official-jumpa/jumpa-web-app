import { useEffect, useState } from "react";

/** The status `/api/transactions/[id]` reports for one entry. */
export type SettlementStatus = "pending" | "completed" | "failed";

export type Settlement = {
  status: SettlementStatus;
  /** True while a read is still due; false once it settles or the minute is up. */
  checking: boolean;
};

const POLL_MS = 3000;
const GIVE_UP_MS = 60_000;

/**
 * Re-reads a transfer the bank is still processing until it settles or a
 * minute passes. Each read waits for the last, so a slow answer never stacks.
 */
export function useTransferSettlement(
  transactionId: string | null,
): Settlement {
  const [status, setStatus] = useState<SettlementStatus>("pending");
  const [gaveUp, setGaveUp] = useState(false);

  useEffect(() => {
    if (!transactionId) return;
    const controller = new AbortController();
    const giveUpAt = Date.now() + GIVE_UP_MS;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const check = async () => {
      try {
        const res = await fetch(
          `/api/transactions/${encodeURIComponent(transactionId)}`,
          { cache: "no-store", signal: controller.signal },
        );
        const data = res.ok ? await res.json() : null;
        if (controller.signal.aborted) return;
        const next = data?.transaction?.status;
        if (next === "completed" || next === "failed") {
          setStatus(next);
          return;
        }
      } catch {
        // Unmounted, or a dropped request that the next read retries.
        if (controller.signal.aborted) return;
      }
      if (Date.now() + POLL_MS < giveUpAt) timer = setTimeout(check, POLL_MS);
      else setGaveUp(true);
    };

    timer = setTimeout(check, POLL_MS);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [transactionId]);

  return {
    status,
    checking: transactionId !== null && status === "pending" && !gaveUp,
  };
}
