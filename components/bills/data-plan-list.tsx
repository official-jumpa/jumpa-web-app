"use client";

import {
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  type DataPlan,
  type DataPlanPeriod,
  formatDataVolume,
  formatPlanSize,
  planValidityLabel,
} from "@/lib/bills";
import { friendlyBillError } from "@/lib/bills-errors";
import { cn } from "@/lib/cn";
import {
  isValidNigerianPhone,
  normalizeNigerianPhone,
} from "@/lib/validations/bills.validation";

function Notice({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-40 flex-col items-center justify-center rounded-row bg-jumpa-neutral-50 p-6 text-center text-xs leading-4 font-medium text-jumpa-ink-muted">
      {children}
    </div>
  );
}

/**
 * Bundles the number's carrier sells for one period. Loads once the number is
 * valid; the provider also reports the carrier, which can correct the guess.
 */
export function DataPlanList({
  phone,
  period,
  selected,
  onSelect,
  onNetworkDetected,
}: {
  phone: string;
  period: DataPlanPeriod;
  selected: DataPlan | null;
  onSelect: (plan: DataPlan) => void;
  onNetworkDetected: (network: string) => void;
}) {
  const [plans, setPlans] = useState<DataPlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const number = isValidNigerianPhone(phone)
    ? normalizeNigerianPhone(phone)
    : "";
  const onDetected = useRef(onNetworkDetected);
  onDetected.current = onNetworkDetected;

  const load = useCallback(async () => {
    if (!number) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/v1/bills/data?phone=${encodeURIComponent(number)}&_t=${Date.now()}`,
        {
          cache: "no-store",
          headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
        },
      );
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        setError(
          data.error || "Failed to load data plans from network provider.",
        );
        setPlans([]);
        return;
      }
      if (!Array.isArray(data.plans) || data.plans.length === 0) {
        setError("No data plans available for this phone number.");
        setPlans([]);
        return;
      }

      setPlans(
        data.plans.map((plan: DataPlan) => ({
          ...plan,
          size: formatDataVolume(plan.size, plan.productName || plan.validity),
        })),
      );
      if (data.detectedNetwork) onDetected.current(data.detectedNetwork);
    } catch (err) {
      // Same mapper as the checkout, so a parser or gateway error never reaches the user verbatim.
      setError(friendlyBillError(err, "data").message);
      setPlans([]);
    } finally {
      setLoading(false);
    }
  }, [number]);

  useEffect(() => {
    setPlans([]);
    load();
  }, [load]);

  if (!number)
    return <Notice>Enter a phone number to see its data bundles.</Notice>;

  if (loading) {
    return (
      <Notice>
        <span className="size-6 animate-spin rounded-full border-2 border-jumpa-primary-600 border-t-transparent" />
        <span className="mt-2">Loading data bundles...</span>
      </Notice>
    );
  }

  if (error) {
    return (
      <Notice>
        <span className="max-w-xs text-jumpa-danger">{error}</span>
        <button
          type="button"
          onClick={() => load()}
          className="tap mt-3.5 rounded-pill bg-jumpa-primary-50 px-5 py-2 font-semibold text-jumpa-primary-600 active:scale-95"
        >
          Try Again
        </button>
      </Notice>
    );
  }

  const shown = plans
    .filter((plan) => plan.period === period)
    .sort((a, b) => (a.numericPrice || 0) - (b.numericPrice || 0));

  if (shown.length === 0)
    return <Notice>No bundles available for this period</Notice>;

  return (
    <ul className="flex flex-col gap-3">
      {shown.map((plan) => {
        const active = plan.id === selected?.id;
        return (
          <li key={plan.id}>
            <button
              type="button"
              aria-pressed={active}
              onClick={() => onSelect(plan)}
              className={cn(
                "tap flex h-17.75 w-full items-center justify-between gap-3 rounded-row px-4.75 text-left active:scale-[0.98]",
                active
                  ? "bg-jumpa-violet-25 inset-ring-[1.5px] inset-ring-jumpa-primary-600"
                  : "bg-jumpa-neutral-50",
              )}
            >
              <span className="flex min-w-0 flex-col gap-1.5">
                <span className="text-lg leading-none font-bold tracking-jumpa-snug text-jumpa-ink">
                  {formatPlanSize(plan.size)}
                </span>
                <span className="truncate text-[13px] leading-none tracking-jumpa-snug text-jumpa-ink-muted">
                  {planValidityLabel(plan.validity)}
                </span>
              </span>
              <span className="shrink-0 text-[17px] leading-none font-semibold tracking-jumpa-snug text-jumpa-ink">
                {plan.price}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
