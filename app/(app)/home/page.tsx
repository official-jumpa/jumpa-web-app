"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AssetList } from "@/components/home/asset-list";
import { BalancePanel } from "@/components/home/balance-panel";
import { BottomNav } from "@/components/home/bottom-nav";
import { HeroBackdrop } from "@/components/home/hero-backdrop";
import { KycCard } from "@/components/home/kyc-card";
import { PromotionList } from "@/components/home/promotion-list";
import { QuickActions } from "@/components/home/quick-actions";
import { TransactionHistory } from "@/components/home/transaction-history";
import { WalletHeader } from "@/components/home/wallet-header";
import { RiseIn } from "@/components/ui/rise-in";
import { unifyTokens } from "@/lib/assets";
import {
  ACCOUNT,
  ASSETS,
  type Asset,
  PROMOTIONS,
  type Transaction,
} from "@/lib/wallet";

export default function HomePage() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [totalBalance, setTotalBalance] = useState<string>(ACCOUNT.balance);
  const [assets, setAssets] = useState<Asset[]>(ASSETS);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    // Verify session & wallet status
    fetch("/api/auth/status")
      .then((res) => res.json())
      .then((status) => {
        if (!status.authenticated) {
          router.replace("/onboarding");
          return;
        }
        if (!status.hasWallet) {
          router.replace("/sign-up/pin");
          return;
        }
        setCheckingAuth(false);

        // 2. Fetch live balances
        return fetch("/api/wallet/balance")
          .then((res) => {
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res.json();
          })
          .then((data) => {
            if (data.totalUsd) {
              setTotalBalance(data.totalUsd);
            }
            if (
              data.tokens &&
              Array.isArray(data.tokens) &&
              data.tokens.length > 0
            ) {
              const unified = unifyTokens(data.tokens);
              setAssets(unified);
            }
          });
      })
      .catch((err) => {
        console.warn("[Home] Error checking auth status:", err);
        setCheckingAuth(false);
      });
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
            <PromotionList promotions={PROMOTIONS} />
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
