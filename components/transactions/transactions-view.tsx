"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { StatementSheet } from "@/components/settings/statement-sheet";
import { FilterSheet } from "@/components/transactions/filter-sheet";
import { HistoryBalanceCard } from "@/components/transactions/history-balance-card";
import { HistoryTabs } from "@/components/transactions/history-tabs";
import { HistoryToolbar } from "@/components/transactions/history-toolbar";
import { TransactionList } from "@/components/transactions/transaction-list";
import { DownloadLineIcon } from "@/components/ui/icons/download-line";
import { ScreenHeader } from "@/components/ui/screen-header";
import type { TransactionFilter } from "@/lib/cards";
import {
  type HistoryScope,
  historyRangeLabel,
  isHistoryScope,
  toHistoryAsset,
} from "@/lib/history";
import { useRefreshSignal } from "@/lib/refresh";
import { formatTxDate, type Transaction } from "@/lib/wallet";

type Sheet = "filters" | null;

/** The currency tab and, on Crypto, the asset chip; synced to `scope` and `token` in the URL. */
type HistoryTab = { scope?: HistoryScope; asset?: string };

const PAGE_SIZE = 15;

type TransactionsCache = {
  cacheKey: string;
  transactions: Transaction[];
  selectedFilters: Record<string, string>;
  tab: HistoryTab;
  searchQuery: string;
  page: number;
  hasMore: boolean;
};

let cachedState: TransactionsCache | null = null;

function computeCacheKey(
  filters: Record<string, string>,
  tab: HistoryTab,
  search?: string,
): string {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(filters)) {
    if (v && v !== "Show All") {
      parts.push(`${k}=${v}`);
    }
  }
  if (tab.scope) parts.push(`scope=${tab.scope}`);
  if (tab.asset) parts.push(`token=${tab.asset}`);
  parts.sort();
  if (search && search.trim().length >= 3) {
    parts.push(`q=${search.trim()}`);
  }
  return parts.join("&");
}

/** "Last 30 Days" → "30d", the duration value the API and the URL share. */
function toDurationParam(label?: string): string | undefined {
  if (!label || label === "Show All") return undefined;
  if (label.includes("7")) return "7d";
  if (label.includes("30") || label.includes("1 Month")) return "30d";
  if (label.includes("90") || label.includes("3 Months")) return "90d";
  return undefined;
}

function buildFilterParams(
  selected: Record<string, string>,
  tab: HistoryTab,
  page: number = 1,
  search?: string,
): string {
  const params = new URLSearchParams();
  params.set("limit", String(PAGE_SIZE));
  params.set("page", String(page));

  if (tab.scope) params.set("scope", tab.scope);
  if (tab.asset) params.set("token", tab.asset.toLowerCase());

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

  const duration = toDurationParam(selected["Duration"]);
  if (duration) params.set("duration", duration);

  const chain = selected["Chain"];
  if (chain && chain !== "Show All") {
    params.set("chain", chain.toLowerCase());
  }

  if (search && search.trim().length >= 3) {
    params.set("search", search.trim().toLowerCase());
  }

  return params.toString();
}

/**
 * Transaction history. The Naira, USD and Crypto tabs narrow the list to one
 * ledger and show its balance; back from a tab returns to the full history.
 */
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
  const scopeParam = searchParams.get("scope");
  const initialTab: HistoryTab = isHistoryScope(scopeParam)
    ? {
        scope: scopeParam,
        asset: scopeParam === "crypto" ? toHistoryAsset(searchParams.get("token")) : undefined,
      }
    : {};
  const currentCacheKey = computeCacheKey(initialFilterMap, initialTab, initialSearchVal);
  const hasMatchingCache =
    cachedState !== null && cachedState.cacheKey === currentCacheKey;

  const [selectedFilters, setSelectedFilters] = useState<
    Record<string, string>
  >(hasMatchingCache && cachedState ? cachedState.selectedFilters : initialFilterMap);
  const [tab, setTab] = useState<HistoryTab>(
    hasMatchingCache && cachedState ? cachedState.tab : initialTab,
  );

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
      const durationVal = toDurationParam(filtersToSync["Duration"]);
      if (durationVal) {
        currentUrlParams.set("duration", durationVal);
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

  const changeTab = useCallback(
    (next: HistoryTab) => {
      setTab(next);
      const currentUrlParams = new URLSearchParams(window.location.search);
      if (next.scope) currentUrlParams.set("scope", next.scope);
      else currentUrlParams.delete("scope");
      if (next.asset) currentUrlParams.set("token", next.asset.toLowerCase());
      else currentUrlParams.delete("token");
      const newQuery = currentUrlParams.toString();
      router.replace(newQuery ? `${window.location.pathname}?${newQuery}` : window.location.pathname, {
        scroll: false,
      });
    },
    [router],
  );

  // Core fetcher for page 1 transactions (filters, tab or search change)
  const fetchPageOne = useCallback(
    async (filtersState: Record<string, string>, tabState: HistoryTab, searchParam: string) => {
      setLoading(true);
      setPage(1);

      try {
        const queryStr = buildFilterParams(filtersState, tabState, 1, searchParam);
        const res = await fetch(`/api/v1/transactions?${queryStr}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        if (Array.isArray(data.transactions)) {
          setTransactions(data.transactions);
          setHasMore(Boolean(data.pagination?.hasMore));
          cachedState = {
            cacheKey: computeCacheKey(filtersState, tabState, searchParam),
            transactions: data.transactions,
            selectedFilters: filtersState,
            tab: tabState,
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
    fetchPageOne(selectedFilters, tab, debouncedQuery);
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
    fetchPageOne(selectedFilters, tab, debouncedQuery);
  }, [selectedFilters, tab, debouncedQuery, hasServerData, hasMatchingCache, initialSearchVal, fetchPageOne]);

  // Load next page (Infinite Scroll)
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || loading) return;
    setLoadingMore(true);

    const nextPage = page + 1;
    try {
      const queryStr = buildFilterParams(
        selectedFilters,
        tab,
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
              computeCacheKey(selectedFilters, tab, debouncedQuery)
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
            computeCacheKey(selectedFilters, tab, debouncedQuery)
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
    tab,
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
      fetchPageOne(selectedFilters, tab, debouncedQuery);
    }, 12000);

    return () => clearInterval(interval);
  }, [transactions, selectedFilters, tab, debouncedQuery, fetchPageOne]);

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
      <StatementSheet
        kind="all"
        back="/transactions"
        onBack={() => router.back()}
        accountEmail={accountEmail}
      />
    );
  }

  const typeFilter = selectedFilters["Transaction Type"];

  return (
    <>
      <div className="flex flex-col px-4.5 pt-[calc(env(safe-area-inset-top)+1.5rem)] pb-6">
        <ScreenHeader
          back="/home"
          onBack={tab.scope ? () => changeTab({}) : undefined}
          round
          title="Transaction history"
          titleWeight="medium"
          titleStyle="lg"
          action={
            <button
              type="button"
              aria-label="Download statement"
              onClick={() => {
                const next = new URLSearchParams(searchParams);
                next.set("statement", "1");
                router.push(`/transactions?${next}`);
              }}
              className="tap flex size-11 items-center justify-center text-jumpa-neutral-475 active:scale-95"
            >
              <DownloadLineIcon className="size-6" />
            </button>
          }
        />

        <div className={tab.scope ? "mt-2" : "mt-5.5"}>
          <HistoryTabs
            scope={tab.scope}
            asset={tab.asset}
            onScope={(scope) => changeTab(scope === tab.scope ? {} : { scope })}
            onAsset={(asset) => changeTab({ scope: "crypto", asset })}
            onFilters={() => setSheet("filters")}
            filtersActive={hasActiveFilters}
          />
        </div>

        {tab.scope ? (
          <div className="mt-4">
            <HistoryBalanceCard scope={tab.scope} asset={tab.asset} />
          </div>
        ) : null}

        <div className={tab.scope ? "mt-4.25" : "mt-5.5"}>
          <HistoryToolbar
            range={historyRangeLabel(toDurationParam(selectedFilters.Duration))}
            onRange={() => setSheet("filters")}
            query={query}
            onQuery={setQuery}
          />
        </div>

        <div className={tab.scope ? "mt-4.5" : "mt-6"}>
          {loading && transactions.length === 0 ? (
            <div className="py-16 text-center text-xs font-medium text-jumpa-neutral-400 animate-pulse">
              Loading transactions...
            </div>
          ) : (
            <TransactionList
              transactions={visible}
              typeLabel={typeFilter && typeFilter !== "Show All" ? typeFilter : "All"}
              onType={() => setSheet("filters")}
              sentinelRef={sentinelRef}
              loadingMore={loadingMore}
            />
          )}
        </div>
      </div>

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
