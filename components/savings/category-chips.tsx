"use client";

import { ChoiceChips } from "@/components/savings/choice-chips";
import {
  SAVINGS_INPUT,
  savingsShell,
} from "@/components/savings/savings-field";
import { SAVINGS_CATEGORIES } from "@/lib/savings";

/** What gets saved: the chip, or the typed value once "Other" is picked. */
export function resolveCategory(value: string, custom: string): string {
  return value === "Other" ? custom.trim() || "Other" : value;
}

/** Category chips; picking "Other" reveals a field for a custom category. */
export function CategoryChips({
  value,
  custom,
  onChange,
  onCustomChange,
}: {
  value: string;
  custom: string;
  onChange: (next: string) => void;
  onCustomChange: (next: string) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <ChoiceChips
        options={SAVINGS_CATEGORIES}
        value={value}
        onChange={onChange}
      />
      {value === "Other" ? (
        <span className={savingsShell()}>
          <input
            value={custom}
            onChange={(event) => onCustomChange(event.target.value)}
            placeholder="Enter category"
            className={SAVINGS_INPUT}
          />
        </span>
      ) : null}
    </div>
  );
}
