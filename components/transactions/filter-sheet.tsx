import { Fragment, type SVGProps, useEffect, useState } from "react";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { CalendarOutlineIcon } from "@/components/ui/icons/calendar-outline";
import { ChainIcon } from "@/components/ui/icons/chain";
import { CircleCheckIcon } from "@/components/ui/icons/circle-check";
import { TransferLineIcon } from "@/components/ui/icons/transfer-line";
import type { TransactionFilter } from "@/lib/cards";
import { cn } from "@/lib/cn";

/** Glyph in each section's heading disc, keyed by group label. */
const SECTION_ICON: Record<
  string,
  (props: SVGProps<SVGSVGElement>) => React.ReactNode
> = {
  "Transaction Type": TransferLineIcon,
  Status: CircleCheckIcon,
  Duration: CalendarOutlineIcon,
  Chain: ChainIcon,
};

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

  // Sync state if selectedFilters prop changes externally
  useEffect(() => {
    setSelected(
      Object.fromEntries(
        filters.map((filter) => {
          const activeOption = selectedFilters?.[filter.label];
          const isValid = activeOption && filter.options.includes(activeOption);
          return [filter.label, isValid ? activeOption : "Show All"];
        }),
      ),
    );
  }, [filters, selectedFilters]);

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
    <BottomSheet onClose={onClose} tone="lavender">
      <div className="flex h-9.25 items-start justify-between">
        <h2 className="text-[22px] leading-[1.1] font-bold tracking-jumpa-snug text-jumpa-ink">
          Filter transaction
        </h2>
        {hasAnyActiveFilter && (
          <button
            type="button"
            onClick={handleReset}
            className="tap pt-1 text-xs font-semibold text-jumpa-primary-600 active:opacity-75"
          >
            Reset
          </button>
        )}
      </div>

      <div className="mt-3 flex flex-col gap-5">
        {filters.map((filter, index) => {
          const currentVal = selected[filter.label] || "Show All";
          const Icon = SECTION_ICON[filter.label];
          return (
            <Fragment key={filter.label}>
              {index > 0 ? (
                <span className="-mb-px h-px w-full bg-jumpa-neutral-95" />
              ) : null}
              <section className="flex flex-col gap-2.5">
                <h3 className="flex items-center gap-1.5 text-xs leading-[1.4] font-medium tracking-jumpa-snug text-jumpa-ink-muted">
                  <span className="flex size-5 items-center justify-center rounded-full bg-jumpa-primary-50 text-jumpa-primary-600">
                    {Icon ? <Icon className="size-2.5" /> : null}
                  </span>
                  {filter.label}
                </h3>
                <div className="flex flex-wrap gap-2.5">
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
                        className={cn(
                          "tap h-8.25 rounded-tab px-3 text-[10px] leading-4.5 font-medium tracking-jumpa-snug whitespace-nowrap active:scale-[0.98]",
                          isSelected
                            ? "bg-jumpa-primary-75 text-jumpa-primary-600"
                            : "bg-jumpa-neutral-55 text-jumpa-navy-850",
                        )}
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>
              </section>
            </Fragment>
          );
        })}
      </div>

      <Button variant="brand" size="cta" className="mt-2" onClick={handleApply}>
        Apply Filters
      </Button>
      <Button
        variant="outlineLilac"
        size="cta"
        className="mt-2.75"
        onClick={onClose}
      >
        Cancel
      </Button>
    </BottomSheet>
  );
}
