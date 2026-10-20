"use client";

import { useEffect, useRef, useState } from "react";
import { AdBanner } from "@/components/home/ad-banner";
import { AssetList } from "@/components/home/asset-list";
import { BalancePanel } from "@/components/home/balance-panel";
import { FiatAccounts } from "@/components/home/fiat-accounts";
import { HeroBackdrop } from "@/components/home/hero-backdrop";
import { KycCard } from "@/components/home/kyc-card";
import { QuickActions } from "@/components/home/quick-actions";
import { TransactionHistory } from "@/components/home/transaction-history";
import { WalletHeader } from "@/components/home/wallet-header";
import { RiseIn } from "@/components/ui/rise-in";
import { unifyTokens } from "@/lib/assets";
import { onBalanceRefresh } from "@/lib/client-events";
import { ACCOUNT, ASSETS, type Asset, type Transaction } from "@/lib/wallet";

// In-memory cache for instant zero-flicker tab returns
const homeMemoryCache: {
  balance?: string;
  savingsBalance?: string;
  savingsNgnBalance?: string;
  assets?: Asset[];
  transactions?: Transaction[];
  kycComplete?: boolean;
} = {};

export interface HomeViewProps {
  initialBalance?: string;
  initialSavingsBalance?: string;
  initialSavingsNgnBalance?: string;
  initialAssets?: Asset[];
  initialTransactions?: Transaction[];
  initialKycComplete?: boolean;
  initialHasNgnAccount?: boolean;
  initialNgnBalance?: string | null;
  initialHasUnread?: boolean;
}

export function HomeView({
  initialBalance,
  initialSavingsBalance,
  initialSavingsNgnBalance,
  initialAssets,
  initialTransactions,
  initialKycComplete,
  initialHasNgnAccount,
  initialNgnBalance,
  initialHasUnread = false,
}: HomeViewProps) {
  const [totalBalance, setTotalBalance] = useState<string>(
    () => initialBalance ?? homeMemoryCache.balance ?? ACCOUNT.balance,
  );
  const [savingsBalance, setSavingsBalance] = useState<string>(
    () => initialSavingsBalance ?? homeMemoryCache.savingsBalance ?? "0.00",
  );
  const [savingsNgnBalance, setSavingsNgnBalance] = useState<string>(
    () => initialSavingsNgnBalance ?? homeMemoryCache.savingsNgnBalance ?? "0.00",
  );
  const [assets, setAssets] = useState<Asset[]>(
    () => initialAssets ?? homeMemoryCache.assets ?? ASSETS,
  );
  const [transactions, setTransactions] = useState<Transaction[]>(
    () => initialTransactions ?? homeMemoryCache.transactions ?? [],
  );
  const [loadingTransactions, setLoadingTransactions] = useState<boolean>(
    () => !initialTransactions && !homeMemoryCache.transactions,
  );
  const [kycComplete, setKycComplete] = useState<boolean>(
    () => initialKycComplete ?? homeMemoryCache.kycComplete ?? false,
  );
  const [balanceVisible, setBalanceVisible] = useState<boolean>(false);

  const isFirstMount = useRef(true);

  const toggleBalanceVisible = () => {
    setBalanceVisible((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("jumpa_balance_visible", String(next));
      } catch {}
      return next;
    });
  };

  // Restore saved visibility preference from localStorage
  useEffect(() => {
    try {
      const savedVisible = localStorage.getItem("jumpa_balance_visible");
      if (savedVisible !== null) {
        setBalanceVisible(savedVisible === "true");
      }
    } catch {}
  }, []);

  // Update state and memory cache when server props change (e.g. after router navigation)
  useEffect(() => {
    if (initialBalance) {
      setTotalBalance(initialBalance);
      homeMemoryCache.balance = initialBalance;
    }
    if (initialAssets) {
      setAssets(initialAssets);
      homeMemoryCache.assets = initialAssets;
    }
    if (initialTransactions) {
      setTransactions(initialTransactions);
      homeMemoryCache.transactions = initialTransactions;
    }
    if (initialKycComplete !== undefined) {
      setKycComplete(initialKycComplete);
      homeMemoryCache.kycComplete = initialKycComplete;
    }
  }, [initialBalance, initialAssets, initialTransactions, initialKycComplete]);

  // Background revalidation and live refresh listener
  useEffect(() => {
    let isMounted = true;
    let lastFetchRef = Date.now();

    async function fetchTransactions() {
      try {
        const res = await fetch("/api/v1/transactions?limit=5", { cache: "no-store" });
        if (res.ok && isMounted) {
          const data = await res.json();
          if (Array.isArray(data.transactions)) {
            const list = data.transactions.slice(0, 5);
            setTransactions(list);
            homeMemoryCache.transactions = list;
          }
        }
      } catch (err) {
        console.warn("[HomeView] Error fetching transactions:", err);
      } finally {
        if (isMounted) {
          setLoadingTransactions(false);
        }
      }
    }

    async function fetchBalances(forceRefresh = false) {
      try {
        const res = await fetch(
          forceRefresh
            ? "/api/v1/wallet?fields=balance&refresh=true"
            : "/api/v1/wallet?fields=balance",
          { cache: "no-store" }
        );
        if (res.ok && isMounted) {
          const json = await res.json();
          const balanceData = json.data;
          if (balanceData.totalUsd) {
            setTotalBalance(balanceData.totalUsd);
            homeMemoryCache.balance = balanceData.totalUsd;
            try {
              localStorage.setItem("jumpa_last_balance", balanceData.totalUsd);
            } catch {}
          }
          if (
            balanceData.tokens &&
            Array.isArray(balanceData.tokens) &&
            balanceData.tokens.length > 0
          ) {
            const unified = unifyTokens(balanceData.tokens);
            setAssets(unified);
            homeMemoryCache.assets = unified;
            try {
              localStorage.setItem("jumpa_last_assets", JSON.stringify(unified));
            } catch {}
          }
        }
      } catch (err) {
        console.warn("[HomeView] Error fetching balances:", err);
      }
    }

    async function fetchSavings() {
      try {
        const res = await fetch("/api/savings", { cache: "no-store" });
        if (res.ok && isMounted) {
          const data = await res.json();
          const goals: any[] = data.goals || [];
          
          // Total active savings across USDC goals
          const usdcActive = goals
            .filter((g) => g.currency === "USDC" && !g.closed)
            .reduce((sum, g) => sum + (Number(g.saved) || 0), 0);

          // Total active savings across NGN goals
          const ngnActive = goals
            .filter((g) => g.currency === "NGN" && !g.closed)
            .reduce((sum, g) => sum + (Number(g.saved) || 0), 0);

          const formattedUsdc = usdcActive.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          });
          const formattedNgn = ngnActive.toLocaleString("en-NG", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          });

          setSavingsBalance(formattedUsdc);
          setSavingsNgnBalance(formattedNgn);
          homeMemoryCache.savingsBalance = formattedUsdc;
          homeMemoryCache.savingsNgnBalance = formattedNgn;
        }
      } catch (err) {
        console.warn("[HomeView] Error fetching savings balance:", err);
      }
    }

    // The server prop can be a prefetched snapshot from before verification finished, so check
    // until it reads complete; this call also settles a pending verification with the provider.
    async function fetchKycStatus() {
      if (homeMemoryCache.kycComplete) return;
      try {
        const res = await fetch("/api/v1/kyc", { cache: "no-store" });
        if (res.ok && isMounted) {
          const data = await res.json();
          const isDone = Boolean(
            data?.isCompleted ||
              data?.status === "approved",
          );
          setKycComplete(isDone);
          homeMemoryCache.kycComplete = isDone;
        }
      } catch (err) {
        console.warn("[HomeView] Error fetching KYC status:", err);
      }
    }

    const hasInitialTx = initialTransactions !== undefined;
    const hasInitialBal = initialBalance !== undefined;
    const hasInitialSavings = initialSavingsBalance !== undefined;
    const hasInitialKyc = initialKycComplete !== undefined;

    if (!hasInitialTx) {
      fetchTransactions();
    }
    if (!hasInitialBal) {
      fetchBalances(false);
    }
    if (!hasInitialSavings) {
      fetchSavings();
    }
    if (!hasInitialKyc && !initialKycComplete) {
      fetchKycStatus();
    }

    // Subscribe to balance refresh events triggered upon transaction completion
    const unsub = onBalanceRefresh(() => {
      homeMemoryCache.balance = undefined;
      homeMemoryCache.savingsBalance = undefined;
      homeMemoryCache.savingsNgnBalance = undefined;
      homeMemoryCache.assets = undefined;
      fetchBalances(true);
      fetchSavings();
      fetchTransactions();
    });

    // Revalidate on tab focus or visibility change (e.g. user returns to app)
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        const now = Date.now();
        if (now - lastFetchRef > 8000) {
          lastFetchRef = now;
          fetchBalances(false);
          fetchSavings();
          fetchTransactions();
          fetchKycStatus();
        }
      }
    };

    window.addEventListener("focus", handleVisibility);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      isMounted = false;
      unsub();
      window.removeEventListener("focus", handleVisibility);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [initialBalance, initialSavingsBalance, initialSavingsNgnBalance, initialTransactions, initialAssets, initialKycComplete]);

  return (
    <>
      <div className="relative isolate flex flex-col gap-6 border-b border-jumpa-primary-950 bg-[image:var(--gradient-jumpa-hero)] px-4.5 pt-[calc(env(safe-area-inset-top)+1rem)] pb-6">
        <HeroBackdrop />
        <WalletHeader
          initialHasUnread={initialHasUnread}
          kycVerified={kycComplete}
        />
        <BalancePanel
          balance={totalBalance}
          savingsBalance={savingsBalance}
          savingsNgnBalance={savingsNgnBalance}
          visible={balanceVisible}
          onToggleVisible={toggleBalanceVisible}
        />
      </div>

      {/* Sections land one after another, top to bottom. */}
      <div className="flex flex-col gap-4 px-4.5 pt-4 pb-6">
        <RiseIn index={0}>
          <AssetList assets={assets} visible={balanceVisible} />
        </RiseIn>
        <RiseIn index={1}>{kycComplete ? <AdBanner /> : <KycCard />}</RiseIn>
        <RiseIn index={2}>
          <QuickActions />
        </RiseIn>
        <RiseIn index={3}>
          <FiatAccounts
            initialHasNgnAccount={initialHasNgnAccount}
            initialNgnBalance={initialNgnBalance}
            initialKycComplete={kycComplete}
          />
        </RiseIn>
        <RiseIn index={4}>
          <TransactionHistory
            transactions={transactions}
            loading={loadingTransactions}
          />
        </RiseIn>
      </div>
    </>
  );
}
