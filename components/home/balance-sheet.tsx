"use client";

import { SheetPortal } from "@/components/ui/sheet-portal";
import { BALANCE_BUCKETS } from "@/lib/transfer";

/**
 * Where the total balance actually sits, one row per product. Portalled: the
 * hero is `isolate`, so a sheet rendered inside it would paint under the nav.
 */
export function BalanceSheet({
  balance,
  onClose,
}: {
  balance: string;
  onClose: () => void;
}) {
  return (
    <SheetPortal onClose={onClose}>
      <h2 className="text-xl leading-6 font-bold text-jumpa-black">
        Balance Details
      </h2>

      <p className="mt-4 text-sm leading-4.5 text-jumpa-neutral-400">
        Your Total Balance
      </p>
      <p className="mt-1 text-[28px] leading-8 font-bold text-jumpa-black">
        ${balance}
      </p>

      <ul className="mt-4 flex flex-col gap-2">
        {BALANCE_BUCKETS.map((bucket) => (
          <li
            key={bucket.id}
            className="flex items-center justify-between gap-3 rounded-panel bg-jumpa-neutral-50 px-3 py-3"
          >
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-sm leading-4.5 font-medium text-jumpa-black">
                {bucket.label}
              </span>
              {bucket.caption ? (
                <span className="truncate text-[11px] leading-3.5 text-jumpa-neutral-350">
                  {bucket.caption}
                </span>
              ) : null}
            </span>

            {/* A null amount is a product that has not launched yet. */}
            {bucket.amount === null ? (
              <span className="shrink-0 rounded-pill bg-jumpa-primary-50 px-3 py-1 text-[10px] leading-4 font-semibold text-jumpa-primary-600">
                Coming Soon
              </span>
            ) : (
              <span className="shrink-0 text-sm leading-4.5 font-semibold text-jumpa-black">
                {bucket.amount}
              </span>
            )}
          </li>
        ))}
      </ul>
    </SheetPortal>
  );
}
