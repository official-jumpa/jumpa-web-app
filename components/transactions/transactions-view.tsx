"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { StatementForm } from "@/components/settings/statement-form";
import { FilterSheet } from "@/components/transactions/filter-sheet";
import { HistoryMenuSheet } from "@/components/transactions/history-menu-sheet";
import { TransactionList } from "@/components/transactions/transaction-list";
import { FilterLinesIcon } from "@/components/ui/icons/filter-lines";
import { SearchAltIcon } from "@/components/ui/icons/search-alt";
import { ScreenHeader } from "@/components/ui/screen-header";
import type { TransactionFilter } from "@/lib/cards";
import { useRefreshSignal } from "@/lib/refresh";
import { formatTxDate, type Transaction } from "@/lib/wallet";

type Sheet = "menu" | "filters" | null;

const PAGE_SIZE = 15;

type TransactionsCache = {
  cacheKey: string;
  transactions: Transaction[];
  selectedFilters: Record<string, string>;
  searchQuery: string;
  page: number;
  hasMore: boolean;
};

let cachedState: TransactionsCache | null = null;

function computeCacheKey(
  filters: Record<string, string>,
  search?: string,
): string {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(filters)) {
    if (v && v !== "Show All") {
      parts.push(`${k}=${v}`);
    }
  }
  parts.sort();
  if (search && search.trim().length >= 3) {
    parts.push(`q=${search.trim()}`);
  }
  return parts.join("&");
}

function buildFilterParams(
  selected: Record<string, string>,
  page: number = 1,
  search?: string,
): string {
  const params = new URLSearchParams();
  params.set("limit", String(PAGE_SIZE));
  params.set("page", String(page));

  const type = selected["Transaction Type"];
  if (type && type !== "Show All") {
    params.set("type", type.toLowerCase());
  }

  const card = selected["Card"];
  if (card && card !== "Show All") {
    params.set("card", card.toLowerCase());
  }

  const status = selected["Status"];
  if (status && status !== "Show All") {
    params.set("status", status.toLowerCase());
  }

  const duration = selected["Duration"];
  if (duration && duration !== "Show All") {
    if (duration.includes("7")) params.set("duration", "7d");
    else if (duration.includes("30") || duration.includes("1 Month"))
      params.set("duration", "30d");
    else if (duration.includes("90") || duration.includes("3 Months"))
      params.set("duration", "90d");
  }

  const chain = selected["Chain"];
  if (chain && chain !== "Show All") {
    params.set("chain", chain.toLowerCase());
  }

  if (search && search.trim().length >= 3) {
    params.set("search", search.trim().toLowerCase());
  }

  return params.toString();
}

/** Transaction history. The funnel button opens the export/filter menu. */
export function TransactionsView({
  transactions: initialTransactions,
  filters,
  initialChain,
  initialSearch,
  accountEmail,
}: {
  transactions?: Transaction[];
  filters: TransactionFilter[];
  initialChain?: string;
  initialSearch?: string;
  /** Seeds the statement screen's email field. */
  accountEmail?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sheet, setSheet] = useState<Sheet>(null);

  const getInitialSearchFromUrl = (): string => {
    const searchStr =
      typeof window !== "undefined" && window.location.search
        ? window.location.search
        : searchParams?.toString() || "";
    const rawParams = new URLSearchParams(
      searchStr.startsWith("?") ? searchStr.slice(1) : searchStr,
    );
    const s = rawParams.get("search") || rawParams.get("q") || initialSearch || "";
    return s.trim();
  };

  const initialSearchVal = getInitialSearchFromUrl();

  const onStatement = searchParams.get("statement") !== null;

  // Map URL search params back to user-friendly filter labels on mount
  const getInitialFiltersFromUrl = (): Record<string, string> => {
    const map: Record<string, string> = {};

    const searchStr =
      typeof window !== "undefined" && window.location.search
        ? window.location.search
        : searchParams?.toString() || "";
    const rawParams = new URLSearchParams(
      searchStr.startsWith("?") ? searchStr.slice(1) : searchStr,
    );
    const params = new URLSearchParams();
    rawParams.forEach((val, key) => {
      params.set(key.toLowerCase(), val.toLowerCase());
    });

    const chainParam = params.get("chain") || initialChain?.toLowerCase();
    if (chainParam && chainParam !== "show all") {
      map.Chain =
        chainParam.charAt(0).toUpperCase() + chainParam.slice(1).toLowerCase();
    }

    const typeParam = params.get("type");
    if (typeParam) {
      const t = typeParam.toLowerCase();
      if (t === "transfer") map["Transaction Type"] = "Transfer";
      else if (t === "swap") map["Transaction Type"] = "Swap";
      else if (t === "bridge") map["Transaction Type"] = "Bridge";
      else if (t === "deposit") map["Transaction Type"] = "Deposit";
      else if (t === "withdraw") map["Transaction Type"] = "Withdraw";
      else if (t === "savings" || t === "savings_deposit")
        map["Transaction Type"] = "Savings";
      else if (t === "airtime") map["Transaction Type"] = "Airtime";
      else if (t === "data") map["Transaction Type"] = "Data";
      else if (t === "utility") map["Transaction Type"] = "Utility";
    }

    const statusParam = params.get("status");
    if (statusParam) {
      const s = statusParam.toLowerCase();
      if (s === "completed" || s === "confirmed") map.Status = "Completed";
      else if (s === "pending") map.Status = "Pending";
      else if (s === "failed") map.Status = "Failed";
    }

    const durationParam = params.get("duration");
    if (durationParam) {
      const d = durationParam.toLowerCase();
      if (d.includes("7")) map.Duration = "Last 7 Days";
      else if (d.includes("30")) map.Duration = "Last 30 Days";
      else if (d.includes("90")) map.Duration = "Last 90 Days";
    }

    return map;
  };

  const initialFilterMap = getInitialFiltersFromUrl();
  const currentCacheKey = computeCacheKey(initialFilterMap, initialSearchVal);
  const hasMatchingCache =
    cachedState !== null && cachedState.cacheKey === currentCacheKey;

  const [selectedFilters, setSelectedFilters] = useState<
    Record<string, string>
  >(hasMatchingCache && cachedState ? cachedState.selectedFilters : initialFilterMap);

  const [query, setQuery] = useState(
    hasMatchingCache && cachedState ? cachedState.searchQuery : initialSearchVal,
  );
  const [debouncedQuery, setDebouncedQuery] = useState(
    hasMatchingCache && cachedState ? cachedState.searchQuery : initialSearchVal,
  );

  // If there are active filters in the URL on mount, don't show un-filtered server initialTransactions
  const hasServerData =
    initialTransactions !== undefined &&
    !hasMatchingCache;

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    if (hasMatchingCache && cachedState) return cachedState.transactions;
    if (hasServerData && initialTransactions) return initialTransactions;
    return [];
  });
  const [page, setPage] = useState(() => {
    if (hasMatchingCache && cachedState) return cachedState.page;
    return 1;
  });
  const [hasMore, setHasMore] = useState(() => {
    if (hasMatchingCache && cachedState) return cachedState.hasMore;
    if (hasServerData) return (initialTransactions?.length ?? 0) >= 10;
    return true;
  });
  const [loading, setLoading] = useState(() => {
    if (hasMatchingCache) return false;
    return !hasServerData;
  });
  const [loadingMore, setLoadingMore] = useState(false);

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const prevFiltersRef = useRef<string>(
    JSON.stringify(
      hasMatchingCache && cachedState
        ? cachedState.selectedFilters
        : initialFilterMap,
    ),
  );
  const isFirstMount = useRef(true);

  // Debounce search query: trigger query only if empty or >= 3 characters
  useEffect(() => {
    const handler = setTimeout(() => {
      const trimmed = query.trim();
      if (trimmed.length === 0 || trimmed.length >= 3) {
        setDebouncedQuery(trimmed);
      }
    }, 300);

    return () => clearTimeout(handler);
  }, [query]);

  // Keep URL search parameter in sync with debouncedQuery
  useEffect(() => {
    const searchStr =
      typeof window !== "undefined" && window.location.search
        ? window.location.search
        : searchParams?.toString() || "";
    const currentUrlParams = new URLSearchParams(
      searchStr.startsWith("?") ? searchStr.slice(1) : searchStr,
    );
    const urlSearch = (currentUrlParams.get("search") || currentUrlParams.get("q") || "").trim();

    if (debouncedQuery === urlSearch) return;

    if (debouncedQuery.length >= 3) {
      currentUrlParams.set("search", debouncedQuery);
      currentUrlParams.delete("q");
    } else {
      currentUrlParams.delete("search");
      currentUrlParams.delete("q");
    }

    const newQuery = currentUrlParams.toString();
    const newPath = newQuery
      ? `${window.location.pathname}?${newQuery}`
      : window.location.pathname;
    router.replace(newPath, { scroll: false });
  }, [debouncedQuery, router, searchParams]);

  // Sync state if browser back / forward buttons change URL searchParams
  useEffect(() => {
    const urlSearch = (searchParams.get("search") || searchParams.get("q") || "").trim();
    if (urlSearch !== debouncedQuery && (urlSearch.length >= 3 || urlSearch.length === 0)) {
      setQuery(urlSearch);
      setDebouncedQuery(urlSearch);
    }
  }, [searchParams]);

  // Sync all selected filters to the URL query string cleanly
  const syncFiltersToUrl = useCallback(
    (filtersToSync: Record<string, string>) => {
      const currentUrlParams = new URLSearchParams(window.location.search);

      // Preserve active search
      if (debouncedQuery && debouncedQuery.length >= 3) {
        currentUrlParams.set("search", debouncedQuery);
      } else {
        currentUrlParams.delete("search");
        currentUrlParams.delete("q");
      }

      // 1. Chain
      const chainVal = filtersToSync["Chain"];
      if (chainVal && chainVal !== "Show All") {
        currentUrlParams.set("chain", chainVal.toLowerCase());
      } else {
        currentUrlParams.delete("chain");
      }

      // 2. Transaction Type
      const typeVal = filtersToSync["Transaction Type"];
      if (typeVal && typeVal !== "Show All") {
        currentUrlParams.set("type", typeVal.toLowerCase());
      } else {
        currentUrlParams.delete("type");
      }

      // 3. Status
      const statusVal = filtersToSync["Status"];
      if (statusVal && statusVal !== "Show All") {
        currentUrlParams.set("status", statusVal.toLowerCase());
      } else {
        currentUrlParams.delete("status");
      }

      // 4. Duration
      const durationVal = filtersToSync["Duration"];
      if (durationVal && durationVal !== "Show All") {
        if (durationVal.includes("7")) currentUrlParams.set("duration", "7d");
        else if (durationVal.includes("30")) currentUrlParams.set("duration", "30d");
        else if (durationVal.includes("90")) currentUrlParams.set("duration", "90d");
      } else {
        currentUrlParams.delete("duration");
      }

      const newQuery = currentUrlParams.toString();
      const newPath = newQuery
        ? `${window.location.pathname}?${newQuery}`
        : window.location.pathname;
      router.replace(newPath, { scroll: false });
    },
    [router, debouncedQuery],
  );

  // Core fetcher for page 1 transactions (filters or search change)
  const fetchPageOne = useCallback(
    async (filtersState: Record<string, string>, searchParam: string) => {
      setLoading(true);
      setPage(1);

      try {
        const queryStr = buildFilterParams(filtersState, 1, searchParam);
        const res = await fetch(`/api/v1/transactions?${queryStr}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        if (Array.isArray(data.transactions)) {
          setTransactions(data.transactions);
          setHasMore(Boolean(data.pagination?.hasMore));
          cachedState = {
            cacheKey: computeCacheKey(filtersState, searchParam),
            transactions: data.transactions,
            selectedFilters: filtersState,
            searchQuery: searchParam,
            page: 1,
            hasMore: Boolean(data.pagination?.hasMore),
          };
        }
      } catch (err) {
        console.warn("[Transactions] Failed to fetch history:", err);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  // Listen for global pull-to-refresh signal
  useRefreshSignal(() => {
    fetchPageOne(selectedFilters, debouncedQuery);
  });

  // Re-fetch when filters or debounced search change
  useEffect(() => {
    const currentFiltersStr = JSON.stringify(selectedFilters);

    if (isFirstMount.current) {
      isFirstMount.current = false;
      // If we already have matching cache, don't re-fetch on first mount
      if (hasMatchingCache) {
        prevFiltersRef.current = currentFiltersStr;
        return;
      }
      // If server already hydrated transactions matching the initial query, skip
      if (hasServerData && (!initialSearchVal || initialSearchVal === debouncedQuery)) {
        prevFiltersRef.current = currentFiltersStr;
        return;
      }
    }

    prevFiltersRef.current = currentFiltersStr;
    fetchPageOne(selectedFilters, debouncedQuery);
  }, [selectedFilters, debouncedQuery, hasServerData, hasMatchingCache, initialSearchVal, fetchPageOne]);

  // Load next page (Infinite Scroll)
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || loading) return;
    setLoadingMore(true);

    const nextPage = page + 1;
    try {
      const queryStr = buildFilterParams(
        selectedFilters,
        nextPage,
        debouncedQuery,
      );
      const res = await fetch(`/api/v1/transactions?${queryStr}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      if (Array.isArray(data.transactions) && data.transactions.length > 0) {
        setTransactions((prev) => {
          const existingIds = new Set(prev.map((t) => t.id || (t as any)._id));
          const incoming = data.transactions.filter(
            (t: Transaction) => !existingIds.has(t.id || (t as any)._id),
          );
          const updated = [...prev, ...incoming];
          if (
            cachedState &&
            cachedState.cacheKey ===
              computeCacheKey(selectedFilters, debouncedQuery)
          ) {
            cachedState.transactions = updated;
            cachedState.page = nextPage;
            cachedState.hasMore = Boolean(data.pagination?.hasMore);
          }
          return updated;
        });
        setPage(nextPage);
        setHasMore(Boolean(data.pagination?.hasMore));
      } else {
        setHasMore(false);
        if (
          cachedState &&
          cachedState.cacheKey ===
            computeCacheKey(selectedFilters, debouncedQuery)
        ) {
          cachedState.hasMore = false;
        }
      }
    } catch (err) {
      console.warn("[Transactions] Failed to load more:", err);
    } finally {
      setLoadingMore(false);
    }
  }, [
    loadingMore,
    hasMore,
    loading,
    page,
    selectedFilters,
    debouncedQuery,
  ]);

  // IntersectionObserver for bottom infinite scroll sentinel
  useEffect(() => {
    if (!hasMore || loadingMore || loading) return;

    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { rootMargin: "250px" },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, loading, loadMore]);

  // Real-time polling when pending transactions exist
  useEffect(() => {
    const hasPending = transactions.some((t) => t.status === "pending");
    if (!hasPending) return;

    const interval = setInterval(() => {
      fetchPageOne(selectedFilters, debouncedQuery);
    }, 12000);

    return () => clearInterval(interval);
  }, [transactions, selectedFilters, debouncedQuery, fetchPageOne]);

  const hasActiveFilters = Object.values(selectedFilters).some(
    (val) => val && val !== "Show All",
  );

  // Client-side quick filter for instantaneous matching on already loaded items
  const visible = transactions.filter((transaction) => {
    const q = query.trim().toLowerCase();
    if (!q || q.length < 3) return true;
    const cleanQ = q.replace(/^(?:JUMPA-tx_|JUMPA-|Jumpa_|tx_)/i, "").trim();
    const rawId = (
      transaction.id ||
      (transaction as any)._id ||
      ""
    ).toLowerCase();
    const cleanId = rawId.replace(/^(?:JUMPA-tx_|JUMPA-|Jumpa_|tx_)/i, "");
    const displayId = ((transaction as any).displayId || "").toLowerCase();
    const dateStr = transaction.createdAt
      ? formatTxDate(transaction.createdAt).toLowerCase()
      : (transaction.detail || "").toLowerCase();
    return (
      transaction.title.toLowerCase().includes(q) ||
      dateStr.includes(q) ||
      transaction.amount.toLowerCase().includes(q) ||
      (transaction.chain && transaction.chain.toLowerCase().includes(q)) ||
      (cleanQ && cleanId.includes(cleanQ)) ||
      (cleanQ && displayId.includes(cleanQ))
    );
  });

  // The chip row on that screen picks the kind, so it opens on the whole history.
  if (onStatement) {
    return (
      <StatementForm
        kind="general"
        back="/transactions"
        onBack={() => router.back()}
        accountEmail={accountEmail}
      />
    );
  }

  return (
    <>
      <div className="flex flex-col gap-4 px-4.5 pt-[calc(env(safe-area-inset-top)+1.5rem)] pb-6">
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
            placeholder="Search for transactions (min. 3 chars)"
            className="min-w-0 flex-1 bg-transparent text-sm leading-4 text-jumpa-black outline-none placeholder:text-jumpa-primary-950"
          />
        </label>

        {loading && transactions.length === 0 ? (
          <div className="py-16 text-center text-xs font-medium text-jumpa-neutral-400 animate-pulse">
            Loading transactions...
          </div>
        ) : (
          <TransactionList
            transactions={visible}
            sentinelRef={sentinelRef}
            loadingMore={loadingMore}
          />
        )}
      </div>

      {sheet === "menu" ? (
        <HistoryMenuSheet
          onFilters={() => setSheet("filters")}
          onStatement={() => {
            setSheet(null);
            const next = new URLSearchParams(searchParams);
            next.set("statement", "1");
            router.push(`/transactions?${next}`);
          }}
          onClose={() => setSheet(null)}
        />
      ) : null}

      {sheet === "filters" ? (
        <FilterSheet
          filters={filters}
          selectedFilters={selectedFilters}
          onApply={(newFilters) => {
            setSelectedFilters(newFilters);
            syncFiltersToUrl(newFilters);
          }}
          onClose={() => setSheet(null)}
        />
      ) : null}
    </>
  );
}
