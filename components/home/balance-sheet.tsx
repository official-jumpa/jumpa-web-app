"use client";

import type { ComponentType, SVGProps } from "react";
import { BadgePercentIcon } from "@/components/ui/icons/badge-percent";
import { ChartMixedAltIcon } from "@/components/ui/icons/chart-mixed-alt";
import { MoneyWithdrawalIcon } from "@/components/ui/icons/money-withdrawal";
import { MoneybagIcon } from "@/components/ui/icons/moneybag";
import { SheetPortal } from "@/components/ui/sheet-portal";
import { BALANCE_BUCKETS } from "@/lib/transfer";

/** One glyph per product, so a row can never show a bucket it isn't. */
const GLYPH: Record<string, ComponentType<SVGProps<SVGSVGElement>>> = {
  savings: BadgePercentIcon,
  credit: MoneybagIcon,
  "commercial-paper": ChartMixedAltIcon,
  available: MoneyWithdrawalIcon,
};

/** Figma draws these as zero-height lines, so the height has to come back out. */
function BucketRule() {
  return <span className="-mb-px h-px w-full bg-jumpa-neutral-95" />;
}

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
      {/* pb-1 tops the panel's own pb-4 up to the design's 20px. */}
      <div className="flex flex-col gap-4 pb-1">
        <div className="flex flex-col gap-2">
          <h2 className="text-base font-medium text-jumpa-black">
            Your Balance Overview
          </h2>
          <div className="flex flex-col gap-1">
            <p className="text-[32px] font-semibold text-jumpa-black">
              ${balance}
            </p>
            <p className="text-base font-medium text-jumpa-neutral-300">
              Total balance
            </p>
          </div>
        </div>

        <ul className="flex flex-col gap-4 rounded-surface border border-jumpa-neutral-60 bg-jumpa-neutral-50 px-6 py-5">
          {BALANCE_BUCKETS.map((bucket, index) => {
            const Glyph = GLYPH[bucket.id];
            const amount =
              bucket.id === "available" ? `$${balance}` : bucket.amount;

            return (
              <li key={bucket.id} className="flex flex-col gap-4">
                {index > 0 ? <BucketRule /> : null}

                <div className="flex items-center justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-2">
                    {Glyph ? (
                      <Glyph className="size-6 shrink-0 text-jumpa-primary-600" />
                    ) : null}
                    <span className="flex min-w-0 flex-col justify-center">
                      <span className="truncate text-sm font-medium text-jumpa-black">
                        {bucket.label}
                      </span>
                      {bucket.caption ? (
                        <span className="truncate text-xs leading-3.5 text-jumpa-neutral-300">
                          {bucket.caption}
                        </span>
                      ) : null}
                    </span>
                  </span>

                  {/* A null amount is a product that has not launched yet. */}
                  <span
                    className={`shrink-0 text-right text-base font-semibold ${
                      amount === null
                        ? "text-jumpa-neutral-300"
                        : "text-jumpa-black"
                    }`}
                  >
                    {amount ?? "Coming Soon"}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </SheetPortal>
  );
}
