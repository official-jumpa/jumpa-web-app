import Image from "next/image";
import { FilterAltIcon } from "@/components/ui/icons/filter-alt";
import { SOON, SoonTag } from "@/components/ui/soon-tag";
import { getAssetLogo } from "@/lib/assets";
import { cn } from "@/lib/cn";
import { HISTORY_ASSETS, HISTORY_TABS, type HistoryScope } from "@/lib/history";

const CHIP =
  "tap flex h-8.25 shrink-0 items-center gap-1 rounded-tab px-3 text-xs leading-4.5 font-medium tracking-jumpa-snug whitespace-nowrap text-jumpa-navy-850 active:scale-[0.98]";

/** The design's fixed chip widths; a chip it doesn't draw hugs its label. */
const CHIP_WIDTH: Record<string, string> = {
  ngn: "min-w-27.75",
  usd: "min-w-16.5",
  crypto: "min-w-20",
  BTC: "min-w-16.5",
  XLM: "min-w-17.5",
  ETH: "min-w-16.5",
  SOL: "min-w-16.25",
  USDT: "min-w-18",
};

function Chip({
  id,
  mark,
  label,
  active,
  soon,
  onClick,
}: {
  id: string;
  mark: string;
  label: string;
  active: boolean;
  soon?: boolean;
  onClick: () => void;
}) {
  const body = (
    <>
      <Image
        src={mark}
        alt=""
        width={26}
        height={26}
        className="size-3.25 rounded-full object-cover"
      />
      {label}
    </>
  );

  if (soon) {
    return (
      <span className="relative">
        <span
          aria-disabled="true"
          className={cn(CHIP, CHIP_WIDTH[id], "bg-jumpa-neutral-55", SOON)}
        >
          {body}
          <span className="sr-only">(coming soon)</span>
        </span>
        <SoonTag className="-top-1 -right-1" />
      </span>
    );
  }

  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        CHIP,
        CHIP_WIDTH[id],
        active ? "bg-jumpa-primary-50" : "bg-jumpa-neutral-55",
      )}
    >
      {body}
    </button>
  );
}

/**
 * Currency tabs over the history list. On the Crypto tab the row turns into
 * asset chips; the funnel stays pinned to the right in both.
 */
export function HistoryTabs({
  scope,
  asset,
  onScope,
  onAsset,
  onFilters,
  filtersActive,
}: {
  scope?: HistoryScope;
  asset?: string;
  /** Also fires for the selected tab, which the view reads as clearing it. */
  onScope: (scope: HistoryScope) => void;
  /** Tapping the selected chip again clears it, back to every crypto row. */
  onAsset: (asset?: string) => void;
  onFilters: () => void;
  filtersActive?: boolean;
}) {
  const filterButton = (
    <button
      type="button"
      aria-label="Filter transactions"
      onClick={onFilters}
      className="tap relative flex h-8.25 w-8.5 shrink-0 items-center justify-center rounded-full bg-jumpa-neutral-55 text-jumpa-navy-900 active:scale-95"
    >
      <FilterAltIcon className="size-4.75" />
      {filtersActive ? (
        <span className="absolute top-1 right-1 size-1.5 rounded-full bg-jumpa-primary-600" />
      ) : null}
    </button>
  );

  if (scope === "crypto") {
    return (
      <div className="flex items-center gap-1">
        <div className="-ml-4.5 flex min-w-0 flex-1 gap-1.25 overflow-x-auto pl-4.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {HISTORY_ASSETS.map((symbol) => (
            <Chip
              key={symbol}
              id={symbol}
              mark={getAssetLogo(symbol)}
              label={symbol}
              active={asset === symbol}
              onClick={() => onAsset(asset === symbol ? undefined : symbol)}
            />
          ))}
        </div>
        {filterButton}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between">
      {HISTORY_TABS.map((tab) => (
        <Chip
          key={tab.scope}
          id={tab.scope}
          mark={tab.mark}
          label={tab.label}
          active={scope === tab.scope}
          soon={tab.soon}
          onClick={() => onScope(tab.scope)}
        />
      ))}
      {filterButton}
    </div>
  );
}
