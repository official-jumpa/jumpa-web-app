"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AdBanner } from "@/components/home/ad-banner";
import { AssetList } from "@/components/home/asset-list";
import { BalancePanel } from "@/components/home/balance-panel";
import { BottomNav } from "@/components/home/bottom-nav";
import { HeroBackdrop } from "@/components/home/hero-backdrop";
import { KycCard } from "@/components/home/kyc-card";
import { QuickActions } from "@/components/home/quick-actions";
import { TransactionHistory } from "@/components/home/transaction-history";
import { WalletHeader } from "@/components/home/wallet-header";
import { RiseIn } from "@/components/ui/rise-in";
import { unifyTokens } from "@/lib/assets";
import { authClient } from "@/lib/auth-client";
import { ACCOUNT, ASSETS, type Asset, type Transaction } from "@/lib/wallet";

export default function HomePage() {
  const router = useRouter();
  const [totalBalance, setTotalBalance] = useState<string>(ACCOUNT.balance);
  const [assets, setAssets] = useState<Asset[]>(ASSETS);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(true);

  // Restore cached balance, assets, & transactions from localStorage immediately on mount
  useEffect(() => {
    try {
      const savedBal = localStorage.getItem("jumpa_last_balance");
      if (savedBal) setTotalBalance(savedBal);

      const savedAssets = localStorage.getItem("jumpa_last_assets");
      if (savedAssets) {
        const parsed = JSON.parse(savedAssets);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setAssets(parsed);
        }
      }

      const savedTx = localStorage.getItem("jumpa_last_transactions");
      if (savedTx) {
        const parsed = JSON.parse(savedTx);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setTransactions(parsed);
          setLoadingTransactions(false);
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    let isMounted = true;

    // 1. Non-blocking session check
    async function checkSession() {
      try {
        const { data: session } = await authClient.getSession();
        if (!session?.user) {
          router.replace("/onboarding");
        }
      } catch (err) {
        console.warn("[Home] Session check failed:", err);
      }
    }

    //Fetch transactions independently
    async function fetchTransactions() {
      try {
        const res = await fetch("/api/transactions?limit=5");
        if (res.ok && isMounted) {
          const data = await res.json();
          if (Array.isArray(data.transactions)) {
            const list = data.transactions.slice(0, 5);
            setTransactions(list);
            try {
              localStorage.setItem("jumpa_last_transactions", JSON.stringify(list));
            } catch {}
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
            try {
              localStorage.setItem("jumpa_last_assets", JSON.stringify(unified));
            } catch {}
          }
        }
      } catch (err) {
        console.warn("[Home] Error fetching balances:", err);
      }
    }

    checkSession();
    fetchTransactions();
    fetchBalances();

    return () => {
      isMounted = false;
    };
  }, [router]);

  const kycComplete = ACCOUNT.kyc.completed >= ACCOUNT.kyc.total;

  return (
    <>
      <div className="relative isolate flex flex-col gap-6 border-b border-jumpa-primary-950 bg-[image:var(--gradient-jumpa-hero)] px-4.5 pt-[calc(env(safe-area-inset-top)+1rem)] pb-6">
        <HeroBackdrop />
        <WalletHeader />
        <BalancePanel balance={totalBalance} />
      </div>

      {/* Sections land one after another, top to bottom. */}
      <div className="flex flex-col gap-4 px-4.5 pt-4 pb-27">
        <RiseIn index={0}>
          <AssetList assets={assets} />
        </RiseIn>
        <RiseIn index={1}>
          {kycComplete ? (
            <AdBanner />
          ) : (
            <KycCard
              completed={ACCOUNT.kyc.completed}
              total={ACCOUNT.kyc.total}
            />
          )}
        </RiseIn>
        <RiseIn index={2}>
          <QuickActions />
        </RiseIn>
        <RiseIn index={3}>
          <TransactionHistory
            transactions={transactions}
            loading={loadingTransactions}
          />
        </RiseIn>
      </div>

      <BottomNav />
    </>
  );
}
