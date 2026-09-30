import { useState } from "react";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import type { TransactionFilter } from "@/lib/cards";

/** Filter panel with direct string-value state mapping and reset support. */
export function FilterSheet({
  filters,
  selectedFilters,
  onApply,
  onClose,
}: {
  filters: TransactionFilter[];
  selectedFilters?: Record<string, string>;
  onApply?: (selected: Record<string, string>) => void;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      filters.map((filter) => {
        const activeOption = selectedFilters?.[filter.label];
        const isValid = activeOption && filter.options.includes(activeOption);
        return [filter.label, isValid ? activeOption : "Show All"];
      }),
    ),
  );

  const handleReset = () => {
    setSelected(
      Object.fromEntries(filters.map((filter) => [filter.label, "Show All"])),
    );
  };

  const handleApply = () => {
    if (onApply) {
      onApply(selected);
    }
    onClose();
  };

  const hasAnyActiveFilter = Object.values(selected).some(
    (val) => val && val !== "Show All",
  );

  return (
    <BottomSheet onClose={onClose}>
      <div className="flex items-center justify-between">
        <h2 className="text-base leading-4.5 font-semibold text-jumpa-black">
          Filter Transactions
        </h2>
        {hasAnyActiveFilter && (
          <button
            type="button"
            onClick={handleReset}
            className="text-xs font-semibold text-jumpa-primary-600 hover:text-jumpa-primary-700 active:opacity-75 transition-colors"
          >
            Reset
          </button>
        )}
      </div>

      <div className="mt-5 flex flex-col gap-4">
        {filters.map((filter) => {
          const currentVal = selected[filter.label] || "Show All";
          return (
            <div key={filter.label} className="flex flex-col gap-2">
              <h3 className="text-xs leading-3.5 font-medium text-jumpa-black">
                {filter.label}
              </h3>
              <div className="flex flex-wrap gap-2">
                {filter.options.map((option) => {
                  const isSelected = currentVal === option;
                  return (
                    <button
                      key={option}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() =>
                        setSelected((current) => ({
                          ...current,
                          [filter.label]: option,
                        }))
                      }
                      className={`h-7 rounded-pill px-2.25 text-[10px] leading-3 font-medium whitespace-nowrap transition-colors ${
                        isSelected
                          ? "bg-jumpa-primary-50 text-jumpa-primary-600 font-semibold"
                          : "bg-jumpa-neutral-50 text-jumpa-black hover:bg-jumpa-neutral-100"
                      }`}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <Button
        variant="gradientSheet"
        size="lg"
        className="mt-6"
        onClick={handleApply}
      >
        Apply Filters
      </Button>
      <Button size="lg" className="mt-2 font-semibold" onClick={onClose}>
        Cancel
      </Button>
    </BottomSheet>
  );
}
