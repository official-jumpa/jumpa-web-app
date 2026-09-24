"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { CloseButton } from "@/components/transfer/close-button";
import { CanvasError } from "@/components/ui/field-error";
import { SearchAltIcon } from "@/components/ui/icons/search-alt";
import { friendlyBillError } from "@/lib/bills-errors";
import {
  DATA_PERIODS,
  type DataPlan,
  type DataPlanPeriod,
  type MobileNetwork,
  getNetwork,
  formatDataVolume,
} from "@/lib/bills";
import { useRef } from "react";

const PERIOD =
  "tap h-8.5 rounded-pill px-5 text-xs leading-4 font-medium active:scale-95";

/** Bundles for the chosen carrier, filtered by period and a free-text search. */
export function DataPlans({
  network,
  phone,
  selected,
  onSelect,
  onClose,
  onContinue,
  onNetworkChange,
}: {
  network: MobileNetwork;
  phone: string;
  selected: DataPlan | null;
  onSelect: (plan: DataPlan) => void;
  onClose: () => void;
  onContinue: () => void;
  onNetworkChange?: (networkId: string) => void;
}) {
  const [period, setPeriod] = useState<DataPlanPeriod>("daily");
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string>();
  const [plansList, setPlansList] = useState<DataPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [carrierNotice, setCarrierNotice] = useState<string | null>(null);

  const networkIdRef = useRef(network.id);
  networkIdRef.current = network.id;

  const loadPlans = useCallback(async () => {
    if (!phone) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setFetchError(null);
    try {
      const res = await fetch(
        `/api/bills/data-plans?phone=${encodeURIComponent(phone)}&_t=${Date.now()}`,
        {
          cache: "no-store",
          headers: {
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
          },
        },
      );
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        const errMsg =
          data.error || "Failed to load data plans from network provider.";
        console.error("[DataPlans] Error:", errMsg);
        setFetchError(errMsg);
        setPlansList([]);
        return;
      }

      if (data.plans && Array.isArray(data.plans) && data.plans.length > 0) {
        const sanitized = data.plans.map((p: DataPlan) => ({
          ...p,
          size: formatDataVolume(p.size, p.productName || p.validity),
        }));
        setPlansList(sanitized);
        if (data.detectedNetwork && data.detectedNetwork !== networkIdRef.current) {
          const detectedNet = getNetwork(data.detectedNetwork);
          const targetName = detectedNet?.label || data.detectedNetwork.toUpperCase();
          setCarrierNotice(`Detected ${targetName} number — updated to ${targetName} bundles.`);
          onNetworkChange?.(data.detectedNetwork);
        } else {
          setCarrierNotice(null);
        }
      } else {
        setFetchError("No data plans available for this phone number.");
        setPlansList([]);
      }
    } catch (err) {
      // Same mapper as the checkout, so a parser or gateway error from the
      // plans lookup cannot reach the user verbatim either.
      setFetchError(friendlyBillError(err, "data").message);
      setPlansList([]);
    } finally {
      setIsLoading(false);
    }
  }, [phone, onNetworkChange]);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  const term = query.trim().toLowerCase();
  const plans = plansList
    .filter(
      (plan) =>
        plan.period === period &&
        (term === "" ||
          plan.size.toLowerCase().includes(term) ||
          plan.price.toLowerCase().includes(term) ||
          plan.validity.toLowerCase().includes(term)),
    )
    .sort((a, b) => (a.numericPrice || 0) - (b.numericPrice || 0));


  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center gap-3 px-4.5 pt-[calc(env(safe-area-inset-top)+1.5rem)] pb-4">
        <CloseButton onClick={onClose} label="Cancel purchase" />
        <div className="flex min-w-0 flex-1 items-center justify-center gap-2">
          <span className="shrink-0 text-lg leading-4 font-medium text-jumpa-black">
            To
          </span>
          <span className="truncate rounded-pill bg-jumpa-primary-50 px-3 py-1.5 text-[10px] leading-4 font-medium text-jumpa-primary-600">
            {network.label} - {phone}
          </span>
        </div>
        <span aria-hidden="true" className="size-9.5 shrink-0" />
      </header>

      <div className="flex flex-1 flex-col rounded-t-dock bg-jumpa-primary-575 px-4.5 pt-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
        {carrierNotice ? (
          <div className="mb-3.5 flex items-center gap-2.5 rounded-2xl bg-jumpa-white/20 px-4 py-2.5 text-xs font-medium text-jumpa-white backdrop-blur-xs shadow-xs">
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-jumpa-white text-[11px] font-bold text-jumpa-primary-600">
              ✓
            </span>
            <span className="flex-1 leading-4">{carrierNotice}</span>
          </div>
        ) : null}

        <label className="flex h-13 shrink-0 items-center gap-3 rounded-pill bg-jumpa-white px-5">
          <SearchAltIcon className="size-5 shrink-0 text-jumpa-primary-600" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search Data Plans"
            aria-label="Search data plans"
            className="w-full bg-transparent text-sm leading-4.5 font-medium text-jumpa-primary-950 caret-jumpa-primary-600 outline-none placeholder:text-jumpa-primary-950"
          />
        </label>

        <div className="mt-4.5 flex shrink-0 gap-2">
          {DATA_PERIODS.map((entry) => (
            <button
              key={entry.value}
              type="button"
              aria-pressed={entry.value === period}
              onClick={() => setPeriod(entry.value)}
              className={`${PERIOD} ${entry.value === period
                  ? "bg-jumpa-white text-jumpa-primary-600"
                  : "bg-jumpa-white/20 text-jumpa-white"
                }`}
            >
              {entry.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="mt-4.5 flex min-h-48 flex-1 items-center justify-center rounded-surface bg-jumpa-white p-6">
            <div className="flex flex-col items-center gap-2">
              <span className="size-6 animate-spin rounded-full border-2 border-jumpa-primary-600 border-t-transparent" />
              <span className="text-xs font-medium text-jumpa-neutral-500">
                Loading data bundles...
              </span>
            </div>
          </div>
        ) : fetchError ? (
          <div className="mt-4.5 flex min-h-48 flex-1 flex-col items-center justify-center rounded-surface bg-jumpa-white p-6 text-center">
            <p className="max-w-xs text-xs font-medium text-jumpa-warning">
              {fetchError}
            </p>
            <button
              type="button"
              onClick={() => loadPlans()}
              className="mt-3.5 rounded-pill bg-jumpa-primary-50 px-5 py-2 text-xs font-semibold text-jumpa-primary-600 active:scale-95"
            >
              Try Again
            </button>
          </div>
        ) : plans.length === 0 ? (
          <div className="mt-4.5 flex min-h-48 flex-1 items-center justify-center rounded-surface bg-jumpa-white p-6">
            <span className="text-xs font-medium text-jumpa-neutral-500">
              No bundles available for this period
            </span>
          </div>
        ) : (
          <ul className="mt-4.5 max-h-[380px] overflow-y-auto rounded-surface bg-jumpa-white px-4 py-1 overscroll-contain">
            {plans.map((plan, position) => (
              <li key={plan.id}>
                <button
                  type="button"
                  aria-pressed={plan.id === selected?.id}
                  onClick={() => {
                    setError(undefined);
                    onSelect(plan);
                  }}
                  className={`tap flex w-full items-center gap-3 rounded-xl px-2 py-3.5 text-left ${plan.id === selected?.id ? "bg-jumpa-primary-50" : ""
                    }`}
                >
                  <span
                    style={{ backgroundColor: network.tint }}
                    className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full"
                  >
                    <Image
                      src={network.logo}
                      alt=""
                      width={40}
                      height={40}
                      className={
                        network.tint
                          ? "size-5.5 object-contain"
                          : "size-full object-cover"
                      }
                    />
                  </span>

                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="flex items-center gap-1.5">
                      <span className="text-sm leading-4.5 font-bold text-jumpa-black">
                        {formatDataVolume(plan.size, plan.productName || plan.validity)}
                      </span>
                      {/* No way to correctly determine hot deals for now */}
                      {/* {plan.hot ? (
                        <span className="rounded-pill bg-jumpa-danger px-1.5 py-0.5 text-[8px] leading-3 font-bold text-jumpa-white">
                          Hot Deals
                        </span>
                      ) : null} */}
                    </span>
                    <span className="truncate text-xs leading-4 text-jumpa-neutral-500">
                      {plan.validity}
                    </span>
                  </span>

                  <span className="shrink-0 text-base leading-5 font-bold text-jumpa-black">
                    {plan.price}
                  </span>
                </button>

                {/* -mb-px: the design draws a zero-height line. */}
                {position < plans.length - 1 ? (
                  <span className="-mb-px block h-px w-full bg-jumpa-neutral-100" />
                ) : null}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-6 flex shrink-0 flex-col items-center gap-3">
          <CanvasError>{error}</CanvasError>
          <button
            type="button"
            onClick={() =>
              selected
                ? onContinue()
                : setError("Select a data plan to continue.")
            }
            className="tap flex h-14 w-full items-center justify-center rounded-pill bg-jumpa-white text-base leading-4 font-semibold text-jumpa-primary-600 active:scale-[0.98]"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
