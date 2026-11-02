import { CalendarOutlineIcon } from "@/components/ui/icons/calendar-outline";
import { ChevronDownMdIcon } from "@/components/ui/icons/chevron-down-md";
import { SearchIcon } from "@/components/ui/icons/search";

const PILL =
  "flex h-7.75 items-center gap-1.75 rounded-hairline inset-ring-[0.8px] inset-ring-jumpa-lavender-200 text-xs leading-none font-medium tracking-jumpa-snug text-jumpa-grey-450";

/**
 * Date range and search under the history tabs. The range follows the Duration
 * filter, so tapping it opens the filter sheet rather than a picker of its own.
 */
export function HistoryToolbar({
  range,
  onRange,
  query,
  onQuery,
}: {
  range: string;
  onRange: () => void;
  query: string;
  onQuery: (query: string) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2.5">
      <button
        type="button"
        onClick={onRange}
        className={`tap ${PILL} min-w-0 shrink-0 pr-1.5 pl-2.75 active:scale-[0.98]`}
      >
        <CalendarOutlineIcon className="size-3.5 shrink-0" />
        {/* The range reads the clock, so the server's day can differ from the device's. */}
        <span suppressHydrationWarning className="truncate">
          {range}
        </span>
        <ChevronDownMdIcon className="size-4.5 shrink-0" />
      </button>

      <label className={`${PILL} min-w-0 flex-1 px-3.75`}>
        <SearchIcon className="size-3.5 shrink-0" />
        <input
          type="search"
          value={query}
          onChange={(event) => onQuery(event.target.value)}
          placeholder="Search transaction"
          aria-label="Search transactions (at least 3 characters)"
          className="min-w-0 flex-1 bg-transparent text-jumpa-ink outline-none placeholder:text-jumpa-grey-450"
        />
      </label>
    </div>
  );
}
