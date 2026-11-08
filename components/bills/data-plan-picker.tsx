"use client";

import { useState } from "react";
import { BillChip } from "@/components/bills/bill-chip";
import { DataPlanList } from "@/components/bills/data-plan-list";
import { FieldError } from "@/components/ui/field-error";
import { DATA_PERIODS, type DataPlan, type DataPlanPeriod } from "@/lib/bills";

/** Period chips over the number's bundles for that period. */
export function DataPlanPicker({
  phone,
  selected,
  error,
  onSelect,
  onNetworkDetected,
  plansUrl,
}: {
  phone: string;
  selected: DataPlan | null;
  error?: string;
  onSelect: (plan: DataPlan) => void;
  onNetworkDetected: (network: string) => void;
  plansUrl?: string;
}) {
  const [period, setPeriod] = useState<DataPlanPeriod>("monthly");

  return (
    <>
      <div className="mt-4.25 flex gap-2">
        {DATA_PERIODS.map((entry) => (
          <BillChip
            key={entry.value}
            active={entry.value === period}
            onClick={() => setPeriod(entry.value)}
          >
            {entry.label}
          </BillChip>
        ))}
      </div>

      <div className="mt-6.25 flex flex-col gap-2">
        <DataPlanList
          phone={phone}
          period={period}
          selected={selected}
          onSelect={onSelect}
          onNetworkDetected={onNetworkDetected}
          plansUrl={plansUrl}
        />
        <FieldError>{error}</FieldError>
      </div>
    </>
  );
}
