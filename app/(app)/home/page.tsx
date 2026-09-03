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
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [totalBalance, setTotalBalance] = useState<string>(ACCOUNT.balance);
  const [assets, setAssets] = useState<Asset[]>(ASSETS);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const { data: session, error } = await authClient.getSession();
        if (!session?.user) {
          router.replace("/onboarding");
          return;
        }

        // Fetch live balances & 5 recent transactions
        const [balanceRes, txRes] = await Promise.all([
          fetch("/api/wallet/balance"),
          fetch("/api/transactions?limit=5"),
        ]);

        //assume the user has no wallet if the endpoint returns 404
        if (balanceRes.status === 404) {
          router.replace("/sign-up/pin");
          return;
        }

        if (balanceRes.ok) {
          const balanceData = await balanceRes.json();
          if (balanceData.totalUsd) {
            setTotalBalance(balanceData.totalUsd);
          }
          if (
            balanceData.tokens &&
            Array.isArray(balanceData.tokens) &&
            balanceData.tokens.length > 0
          ) {
            const unified = unifyTokens(balanceData.tokens);
            setAssets(unified);
          }
        }

        if (txRes.ok) {
          const txData = await txRes.json();
          if (Array.isArray(txData.transactions)) {
            setTransactions(txData.transactions.slice(0, 5));
          }
        }

        setCheckingAuth(false);
      } catch (err) {
        console.warn("[Home] Error loading dashboard:", err);
        setCheckingAuth(false);
      }
    }

    loadDashboard();
  }, [router]);

  if (checkingAuth) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-jumpa-neutral-50 text-jumpa-primary-950 font-medium text-sm animate-pulse">
        Loading wallet...
      </div>
    );
  }

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
          <TransactionHistory transactions={transactions} />
        </RiseIn>
      </div>

      <BottomNav />
    </>
  );
}
