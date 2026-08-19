import type { ReactNode } from "react";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { FileDownloadIcon } from "@/components/ui/icons/file-download";
import { FilterLinesIcon } from "@/components/ui/icons/filter-lines";

function Item({
  label,
  icon,
  onClick,
}: {
  label: string;
  icon: ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-3 border-b border-jumpa-neutral-100 py-3.5 text-sm leading-4 font-medium text-jumpa-black"
    >
      {icon}
      {label}
    </button>
  );
}

/** Menu behind the header's funnel button: filtering and exports. */
export function HistoryMenuSheet({
  onFilters,
  onClose,
}: {
  onFilters: () => void;
  onClose: () => void;
}) {
  return (
    <BottomSheet onClose={onClose}>
      <div className="flex flex-col">
        <Item
          label="Add Filters"
          onClick={onFilters}
          icon={<FilterLinesIcon className="size-6 text-jumpa-primary-600" />}
        />
        {/* No export service yet, so both downloads just dismiss. */}
        <Item
          label="Download History (PDF)"
          onClick={onClose}
          icon={<FileDownloadIcon className="size-6 text-jumpa-primary-600" />}
        />
        <Item
          label="Download History (CSV)"
          onClick={onClose}
          icon={<FileDownloadIcon className="size-6 text-jumpa-primary-600" />}
        />
      </div>

      <Button
        variant="gradientSheet"
        size="lg"
        className="mt-6"
        onClick={onClose}
      >
        Done
      </Button>
    </BottomSheet>
  );
}
