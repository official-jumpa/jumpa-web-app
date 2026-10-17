import { useEffect, useState } from "react";
import {
  TransactionRow,
  TransactionRule,
} from "@/components/transactions/transaction-row";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import type { Transaction } from "@/lib/wallet";

type Load =
  | { state: "loading" }
  | { state: "failed" }
  | { state: "ready"; transactions: Transaction[] };

const RECENT = 20;

/** Recent history to pick from; the pick goes out with the next message. */
export function TransactionPicker({
  onPick,
  onClose,
}: {
  onPick: (transaction: Transaction) => void;
  onClose: () => void;
}) {
  const [load, setLoad] = useState<Load>({ state: "loading" });
  const [attempt, setAttempt] = useState(0);

  // biome-ignore lint/correctness/useExhaustiveDependencies: attempt is the retry trigger
  useEffect(() => {
    let cancelled = false;
    setLoad({ state: "loading" });
    fetch(`/api/v1/transactions?limit=${RECENT}`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
      .then((data: { transactions?: Transaction[] }) => {
        if (!cancelled)
          setLoad({ state: "ready", transactions: data.transactions ?? [] });
      })
      .catch(() => {
        if (!cancelled) setLoad({ state: "failed" });
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  return (
    <BottomSheet onClose={onClose}>
      <h2 className="text-lg leading-6 font-semibold text-jumpa-black">
        Share a transaction
      </h2>
      <p className="mt-1 text-sm leading-5 text-jumpa-neutral-500">
        Pick the one you need help with. The team sees its full details.
      </p>

      <div className="mt-5 max-h-[55dvh] overflow-y-auto overscroll-contain">
        {load.state === "loading" ? (
          <p className="py-8 text-center text-sm text-jumpa-neutral-500">
            Loading your transactions…
          </p>
        ) : load.state === "failed" ? (
          <div className="flex flex-col items-center gap-2 py-8">
            <p className="text-sm text-jumpa-neutral-700">
              Couldn't load your transactions.
            </p>
            <button
              type="button"
              onClick={() => setAttempt((n) => n + 1)}
              className="tap text-sm font-semibold text-jumpa-primary-600"
            >
              Try again
            </button>
          </div>
        ) : load.transactions.length === 0 ? (
          <p className="py-8 text-center text-sm text-jumpa-neutral-500">
            No transactions yet.
          </p>
        ) : (
          <ul className="flex flex-col gap-4 pb-1">
            {load.transactions.map((transaction, i) => (
              <li key={transaction.id} className="flex flex-col gap-4">
                {i > 0 ? <TransactionRule /> : null}
                <TransactionRow transaction={transaction} onSelect={onPick} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </BottomSheet>
  );
}
