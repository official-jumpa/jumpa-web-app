"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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
import { ACCOUNT, ASSETS, type Asset, type Transaction } from "@/lib/wallet";

// In-memory cache for instant zero-flicker tab returns
let homeMemoryCache: {
  balance?: string;
  assets?: Asset[];
  transactions?: Transaction[];
  kycComplete?: boolean;
} = {};

export default function HomePage() {
  const router = useRouter();
  const [totalBalance, setTotalBalance] = useState<string>(
    () => homeMemoryCache.balance ?? ACCOUNT.balance,
  );
  const [assets, setAssets] = useState<Asset[]>(
    () => homeMemoryCache.assets ?? ASSETS,
  );
  const [transactions, setTransactions] = useState<Transaction[]>(
    () => homeMemoryCache.transactions ?? [],
  );
  const [loadingTransactions, setLoadingTransactions] = useState<boolean>(
    () => !homeMemoryCache.transactions,
  );
  const [kycComplete, setKycComplete] = useState<boolean>(
    () => homeMemoryCache.kycComplete ?? false,
  );
  const [balanceVisible, setBalanceVisible] = useState<boolean>(false);

  const toggleBalanceVisible = () => {
    setBalanceVisible((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("jumpa_balance_visible", String(next));
      } catch {}
      return next;
    });
  };

  // Restore cached balance, assets, & transactions from localStorage immediately on mount if not in memory
  useEffect(() => {
    try {
      const savedVisible = localStorage.getItem("jumpa_balance_visible");
      if (savedVisible !== null) {
        setBalanceVisible(savedVisible === "true");
      }

      const savedBal = localStorage.getItem("jumpa_last_balance");
      if (savedBal && !homeMemoryCache.balance) {
        setTotalBalance(savedBal);
        homeMemoryCache.balance = savedBal;
      }

      const savedAssets = localStorage.getItem("jumpa_last_assets");
      if (savedAssets && !homeMemoryCache.assets) {
        const parsed = JSON.parse(savedAssets);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setAssets(parsed);
          homeMemoryCache.assets = parsed;
        }
      }

      const savedTx = localStorage.getItem("jumpa_last_transactions");
      if (savedTx && !homeMemoryCache.transactions) {
        const parsed = JSON.parse(savedTx);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setTransactions(parsed);
          setLoadingTransactions(false);
          homeMemoryCache.transactions = parsed;
        }
      }

      const savedKyc = localStorage.getItem("jumpa_kyc_completed");
      if (savedKyc !== null && homeMemoryCache.kycComplete === undefined) {
        const isDone = savedKyc === "true";
        setKycComplete(isDone);
        homeMemoryCache.kycComplete = isDone;
      }
    } catch { }
  }, []);

  useEffect(() => {
    let isMounted = true;

    // Fetch transactions independently
    async function fetchTransactions() {
      try {
        const res = await fetch("/api/transactions?limit=5");
        if (res.ok && isMounted) {
          const data = await res.json();
          if (Array.isArray(data.transactions)) {
            const list = data.transactions.slice(0, 5);
            setTransactions(list);
            homeMemoryCache.transactions = list;
            try {
              localStorage.setItem("jumpa_last_transactions", JSON.stringify(list));
            } catch { }
          }
        }
      } catch (err) {
        console.warn("[Home] Error fetching transactions:", err);
      } finally {
        if (isMounted) {
          setLoadingTransactions(false);
        }
      }
    }

    // Fetch live balances independently in the background
    async function fetchBalances() {
      try {
        const res = await fetch("/api/wallet/balance");

        // Assume the user has no wallet if the endpoint returns 404
        if (res.status === 404) {
          router.replace("/sign-up/pin");
          return;
        }

        if (res.ok && isMounted) {
          const balanceData = await res.json();
          if (balanceData.totalUsd) {
            setTotalBalance(balanceData.totalUsd);
            homeMemoryCache.balance = balanceData.totalUsd;
            try {
              localStorage.setItem("jumpa_last_balance", balanceData.totalUsd);
            } catch { }
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
            } catch { }
          }
        }
      } catch (err) {
        console.warn("[Home] Error fetching balances:", err);
      }
    }

    // Fetch KYC status
    async function fetchKycStatus() {
      try {
        const res = await fetch("/api/kyc");
        if (res.ok && isMounted) {
          const data = await res.json();
          const isDone = Boolean(
            data?.isCompleted ||
            data?.status === "approved" ||
            data?.stage === "completed",
          );
          setKycComplete(isDone);
          homeMemoryCache.kycComplete = isDone;
          try {
            localStorage.setItem("jumpa_kyc_completed", String(isDone));
          } catch { }
        }
      } catch (err) {
        console.warn("[Home] Error fetching KYC status:", err);
      }
    }

    fetchTransactions();
    fetchBalances();
    fetchKycStatus();

    return () => {
      isMounted = false;
    };
  }, [router]);

  return (
    <>
      <div className="relative isolate flex flex-col gap-6 border-b border-jumpa-primary-950 bg-[image:var(--gradient-jumpa-hero)] px-4.5 pt-[calc(env(safe-area-inset-top)+1rem)] pb-6">
        <HeroBackdrop />
        <WalletHeader />
        <BalancePanel
          balance={totalBalance}
          visible={balanceVisible}
          onToggleVisible={toggleBalanceVisible}
        />
      </div>

      {/* Sections land one after another, top to bottom. */}
      <div className="flex flex-col gap-4 px-4.5 pt-4 pb-27">
        <RiseIn index={0}>
          <AssetList assets={assets} visible={balanceVisible} />
        </RiseIn>
        <RiseIn index={1}>
          {kycComplete ? (
            <AdBanner />
          ) : (
            <KycCard />
          )}
        </RiseIn>
        <RiseIn index={2}>
          <QuickActions />
        </RiseIn>
        <RiseIn index={3}>
          <FiatAccounts />
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
