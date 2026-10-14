import { useState } from "react";
import type { ComponentType, SVGProps } from "react";
import { BadgePercentIcon } from "@/components/ui/icons/badge-percent";
import { ChartMixedAltIcon } from "@/components/ui/icons/chart-mixed-alt";
import { CircleInformationIcon } from "@/components/ui/icons/circle-information";
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
  savingsBalance = "0.00",
  savingsNgnBalance = "0.00",
  onClose,
}: {
  balance: string;
  savingsBalance?: string;
  savingsNgnBalance?: string;
  onClose: () => void;
}) {
  const [savingsCurrency, setSavingsCurrency] = useState<"USDC" | "NGN">("USDC");
  const [showTooltip, setShowTooltip] = useState(false);

  const availNum = parseFloat(balance.replace(/,/g, "")) || 0;
  const savingsNum = parseFloat(savingsBalance.replace(/[$,]/g, "")) || 0;
  const totalOverview = (availNum + savingsNum).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const formattedUsdc = `$${Number(savingsNum.toFixed(2)).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

  const cleanNgn = savingsNgnBalance.replace(/[₦,]/g, "");
  const ngnNum = parseFloat(cleanNgn) || 0;
  const formattedNgn = `₦${ngnNum.toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

  const toggleSavingsCurrency = () => {
    setSavingsCurrency((prev) => (prev === "USDC" ? "NGN" : "USDC"));
  };

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
              ${totalOverview}
            </p>
            <p className="text-base font-medium text-jumpa-neutral-300">
              Total balance
            </p>
          </div>
        </div>

        <ul className="flex flex-col gap-4 rounded-surface border border-jumpa-neutral-60 bg-jumpa-neutral-50 px-6 py-5">
          {BALANCE_BUCKETS.map((bucket, index) => {
            const Glyph = GLYPH[bucket.id];
            const isSavings = bucket.id === "savings";

            return (
              <li key={bucket.id} className="flex flex-col gap-4">
                {index > 0 ? <BucketRule /> : null}

                <div className="flex items-center justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-2">
                    {Glyph ? (
                      <Glyph className="size-6 shrink-0 text-jumpa-primary-600" />
                    ) : null}
                    <span className="flex min-w-0 flex-col justify-center">
                      <span className="flex items-center gap-1.5 text-sm font-medium text-jumpa-black">
                        {bucket.label}
                        {isSavings ? (
                          <span className="relative inline-flex items-center">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowTooltip((v) => !v);
                              }}
                              onMouseEnter={() => setShowTooltip(true)}
                              onMouseLeave={() => setShowTooltip(false)}
                              aria-label="Savings currency info"
                              className="text-jumpa-neutral-400 hover:text-jumpa-primary-600 focus:outline-none transition-colors p-0.5"
                            >
                              <CircleInformationIcon className="size-3.5" />
                            </button>
                            {showTooltip && (
                              <div
                                role="tooltip"
                                className="absolute bottom-full left-0 mb-2 z-[999] w-56 rounded-lg bg-jumpa-neutral-900 px-3 py-2 text-xs leading-4 font-normal text-jumpa-white shadow-xl pointer-events-none transition-all animate-fade"
                              >
                                Tap the savings amount to switch between USD ($) and Naira (₦).
                                <div className="absolute top-full left-2 -mt-1 border-4 border-transparent border-t-jumpa-neutral-900" />
                              </div>
                            )}
                          </span>
                        ) : null}
                      </span>
                      {bucket.caption ? (
                        <span className="text-xs leading-3.5 text-jumpa-neutral-300">
                          {bucket.caption}
                        </span>
                      ) : null}
                    </span>
                  </span>

                  {isSavings ? (
                    <button
                      type="button"
                      onClick={toggleSavingsCurrency}
                      title="Tap to switch currency"
                      className="group shrink-0 rounded-md px-1 py-0.5 transition-colors hover:bg-black/[0.04] active:scale-95"
                    >
                      <span className="text-right text-base font-semibold text-jumpa-black underline decoration-dotted decoration-jumpa-neutral-300 underline-offset-2 group-hover:decoration-jumpa-primary-600 transition-colors">
                        {savingsCurrency === "USDC" ? formattedUsdc : formattedNgn}
                      </span>
                    </button>
                  ) : (
                    <span
                      className={`shrink-0 text-right text-base font-semibold ${
                        bucket.amount === null
                          ? "text-jumpa-neutral-300"
                          : "text-jumpa-black"
                      }`}
                    >
                      {bucket.id === "available"
                        ? `$${balance}`
                        : (bucket.amount ?? "Coming Soon")}
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </SheetPortal>
  );
}
