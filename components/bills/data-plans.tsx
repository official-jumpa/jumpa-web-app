"use client";

import Image from "next/image";
import { useState } from "react";
import { CloseButton } from "@/components/transfer/close-button";
import { SearchAltIcon } from "@/components/ui/icons/search-alt";
import {
  DATA_PERIODS,
  DATA_PLANS,
  type DataPlan,
  type DataPlanPeriod,
  type MobileNetwork,
} from "@/lib/bills";

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
}: {
  network: MobileNetwork;
  phone: string;
  selected: DataPlan | null;
  onSelect: (plan: DataPlan) => void;
  onClose: () => void;
  onContinue: () => void;
}) {
  const [period, setPeriod] = useState<DataPlanPeriod>("monthly");
  const [query, setQuery] = useState("");

  const term = query.trim().toLowerCase();
  const plans = DATA_PLANS.filter(
    (plan) =>
      plan.period === period &&
      (term === "" ||
        plan.size.toLowerCase().includes(term) ||
        plan.price.toLowerCase().includes(term)),
  );

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center gap-3 px-4.5 pt-6 pb-4">
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
              className={`${PERIOD} ${
                entry.value === period
                  ? "bg-jumpa-white text-jumpa-primary-600"
                  : "bg-jumpa-white/20 text-jumpa-white"
              }`}
            >
              {entry.label}
            </button>
          ))}
        </div>

        <ul className="mt-4.5 min-h-0 flex-1 overflow-y-auto rounded-surface bg-jumpa-white px-4 py-1 [scrollbar-width:none]">
          {plans.map((plan, position) => (
            <li key={plan.id}>
              <button
                type="button"
                aria-pressed={plan.id === selected?.id}
                onClick={() => onSelect(plan)}
                className={`tap flex w-full items-center gap-3 rounded-xl px-2 py-3.5 text-left ${
                  plan.id === selected?.id ? "bg-jumpa-primary-50" : ""
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
                      {plan.size}
                    </span>
                    {plan.hot ? (
                      <span className="rounded-pill bg-jumpa-danger px-1.5 py-0.5 text-[8px] leading-3 font-bold text-jumpa-white">
                        Hot Deals
                      </span>
                    ) : null}
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

        <button
          type="button"
          onClick={onContinue}
          disabled={!selected}
          className="tap mt-6 flex h-14 w-full shrink-0 items-center justify-center rounded-pill bg-jumpa-white text-base leading-4 font-semibold text-jumpa-primary-600 active:scale-[0.98] disabled:opacity-60"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
