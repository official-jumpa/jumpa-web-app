import { useState } from "react";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import type { TransactionFilter } from "@/lib/cards";

/** Filter panel. Selections are local until the history query exists. */
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
  const [selected, setSelected] = useState<Record<string, number>>(() =>
    Object.fromEntries(
      filters.map((filter) => {
        const activeOption = selectedFilters?.[filter.label];
        const idx = activeOption ? filter.options.indexOf(activeOption) : 0;
        return [filter.label, idx >= 0 ? idx : 0];
      }),
    ),
  );

  const handleApply = () => {
    if (onApply) {
      const result: Record<string, string> = {};
      for (const filter of filters) {
        const chosenIndex = selected[filter.label] ?? 0;
        result[filter.label] = filter.options[chosenIndex] || "Show All";
      }
      onApply(result);
    }
    onClose();
  };

  return (
    <BottomSheet onClose={onClose}>
      {/* The design titles this sheet "Your Card PIN" — a copy-paste slip. */}
      <h2 className="text-base leading-4.5 font-semibold text-jumpa-black">
        Filter Transactions
      </h2>

      <div className="mt-5 flex flex-col gap-4">
        {filters.map((filter) => (
          <div key={filter.label} className="flex flex-col gap-2">
            <h3 className="text-xs leading-3.5 font-medium text-jumpa-black">
              {filter.label}
            </h3>
            <div className="flex flex-wrap gap-2">
              {filter.options.map((option, index) => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={selected[filter.label] === index}
                  onClick={() =>
                    setSelected((current) => ({
                      ...current,
                      [filter.label]: index,
                    }))
                  }
                  className={`h-7 rounded-pill px-2.25 text-[10px] leading-3 font-medium whitespace-nowrap ${
                    selected[filter.label] === index
                      ? "bg-jumpa-primary-50 text-jumpa-primary-600"
                      : "bg-jumpa-neutral-50 text-jumpa-black"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        ))}
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
        No, Cancel
      </Button>
    </BottomSheet>
  );
}
