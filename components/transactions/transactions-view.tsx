"use client";

import { useState } from "react";
import { BottomNav } from "@/components/home/bottom-nav";
import { FilterSheet } from "@/components/transactions/filter-sheet";
import { HistoryMenuSheet } from "@/components/transactions/history-menu-sheet";
import { TransactionList } from "@/components/transactions/transaction-list";
import { FilterLinesIcon } from "@/components/ui/icons/filter-lines";
import { SearchAltIcon } from "@/components/ui/icons/search-alt";
import { ScreenHeader } from "@/components/ui/screen-header";
import type { TransactionFilter } from "@/lib/cards";
import type { Transaction } from "@/lib/wallet";

type Sheet = "menu" | "filters" | null;

/** Transaction history. The funnel button opens the export/filter menu. */
export function TransactionsView({
  transactions,
  filters,
}: {
  transactions: Transaction[];
  filters: TransactionFilter[];
}) {
  const [sheet, setSheet] = useState<Sheet>(null);
  const [query, setQuery] = useState("");

  const visible = transactions.filter((transaction) =>
    transaction.merchant.toLowerCase().includes(query.trim().toLowerCase()),
  );

  return (
    <>
      <div className="flex flex-col gap-4 px-4.5 pt-[calc(env(safe-area-inset-top)+1.5rem)] pb-30">
        <ScreenHeader
          back="/cards"
          title="Transaction History"
          action={
            <button
              type="button"
              aria-label="Filter and export"
              onClick={() => setSheet("menu")}
              className="flex size-11 items-center justify-center text-jumpa-primary-600"
            >
              <FilterLinesIcon className="size-6" />
            </button>
          }
        />

        <label className="flex h-14 items-center gap-2 rounded-card bg-jumpa-neutral-50 px-4 text-jumpa-primary-600">
          <SearchAltIcon className="size-6" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search for transactions"
            className="min-w-0 flex-1 bg-transparent text-sm leading-4 text-jumpa-black outline-none placeholder:text-jumpa-primary-600"
          />
        </label>

        <TransactionList transactions={visible} />
      </div>

      <BottomNav />

      {sheet === "menu" ? (
        <HistoryMenuSheet
          onFilters={() => setSheet("filters")}
          onClose={() => setSheet(null)}
        />
      ) : null}

      {sheet === "filters" ? (
        <FilterSheet filters={filters} onClose={() => setSheet(null)} />
      ) : null}
    </>
  );
}
