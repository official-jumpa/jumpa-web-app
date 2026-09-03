"use client";

import { useEffect, useState } from "react";
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

function buildFilterParams(selected: Record<string, string>): string {
  const params = new URLSearchParams();
  params.set("limit", "10");

  const type = selected["Transaction Type"];
  if (type && type !== "Show All") {
    if (type === "Transfer") params.set("type", "TRANSFER");
    else if (type === "Swap") params.set("type", "SWAP");
    else if (type === "Deposit") params.set("type", "ONRAMP");
    else if (type === "Withdraw") params.set("type", "OFFRAMP");
    else if (type === "Utility") params.set("type", "UTILITY");
  }

  const card = selected["Card"];
  if (card && card !== "Show All") {
    params.set("card", card);
  }

  const status = selected["Status"];
  if (status && status !== "Show All") {
    if (status === "Completed") params.set("status", "CONFIRMED");
    else if (status === "Pending") params.set("status", "PENDING");
    else if (status === "Failed") params.set("status", "FAILED");
  }

  const duration = selected["Duration"];
  if (duration && duration !== "Show All") {
    if (duration.includes("7")) params.set("duration", "7d");
    else if (duration.includes("30") || duration.includes("1 Month")) params.set("duration", "30d");
    else if (duration.includes("90") || duration.includes("3 Months")) params.set("duration", "90d");
  }

  const chain = selected["Chain"];
  if (chain && chain !== "Show All") {
    params.set("chain", chain.toLowerCase());
  }

  return params.toString();
}

/** Transaction history. The funnel button opens the export/filter menu. */
export function TransactionsView({
  transactions: initialTransactions = [],
  filters,
}: {
  transactions?: Transaction[];
  filters: TransactionFilter[];
}) {
  const [sheet, setSheet] = useState<Sheet>(null);
  const [query, setQuery] = useState("");
  const [selectedFilters, setSelectedFilters] = useState<Record<string, string>>({});
  const [transactions, setTransactions] =
    useState<Transaction[]>(initialTransactions);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadTransactions() {
      setLoading(true);
      const queryStr = buildFilterParams(selectedFilters);

      try {
        const res = await fetch(`/api/transactions?${queryStr}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (isMounted && Array.isArray(data.transactions)) {
          setTransactions(data.transactions);
        }
      } catch (err) {
        console.warn("[Transactions] Failed to fetch history:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadTransactions();

    return () => {
      isMounted = false;
    };
  }, [selectedFilters]);

  const hasActiveFilters = Object.values(selectedFilters).some(
    (val) => val && val !== "Show All",
  );

  const visible = transactions.filter((transaction) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      transaction.title.toLowerCase().includes(q) ||
      transaction.detail.toLowerCase().includes(q) ||
      transaction.amount.toLowerCase().includes(q) ||
      (transaction.chain && transaction.chain.toLowerCase().includes(q))
    );
  });

  return (
    <>
      <div className="flex flex-col gap-4 px-4.5 pt-[calc(env(safe-area-inset-top)+1.5rem)] pb-30">
        <ScreenHeader
          back="/home"
          title="Transaction History"
          action={
            <button
              type="button"
              aria-label="Filter and export"
              onClick={() => setSheet("menu")}
              className="relative flex size-11 items-center justify-center text-jumpa-primary-600"
            >
              <FilterLinesIcon className="size-6" />
              {hasActiveFilters ? (
                <span className="absolute top-2 right-2 size-2 rounded-full bg-jumpa-primary-600 ring-2 ring-jumpa-neutral-50" />
              ) : null}
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
            className="min-w-0 flex-1 bg-transparent text-sm leading-4 text-jumpa-black outline-none placeholder:text-jumpa-primary-950"
          />
        </label>

        {loading && transactions.length === 0 ? (
          <div className="py-16 text-center text-xs font-medium text-jumpa-neutral-400 animate-pulse">
            Loading transactions...
          </div>
        ) : (
          <TransactionList transactions={visible} />
        )}
      </div>

      <BottomNav />

      {sheet === "menu" ? (
        <HistoryMenuSheet
          onFilters={() => setSheet("filters")}
          onClose={() => setSheet(null)}
        />
      ) : null}

      {sheet === "filters" ? (
        <FilterSheet
          filters={filters}
          selectedFilters={selectedFilters}
          onApply={(newFilters) => setSelectedFilters(newFilters)}
          onClose={() => setSheet(null)}
        />
      ) : null}
    </>
  );
}
