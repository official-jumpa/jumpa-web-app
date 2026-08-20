"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AssetList } from "@/components/home/asset-list";
import { BalancePanel } from "@/components/home/balance-panel";
import { BottomNav } from "@/components/home/bottom-nav";
import { HeroBackdrop } from "@/components/home/hero-backdrop";
import { KycCard } from "@/components/home/kyc-card";
import { PromotionList } from "@/components/home/promotion-list";
import { QuickActions } from "@/components/home/quick-actions";
import { TransactionHistory } from "@/components/home/transaction-history";
import { WalletHeader } from "@/components/home/wallet-header";
import {
  ACCOUNT,
  ASSETS,
  PROMOTIONS,
  type Asset,
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
          router.replace("/sign-up/secure-wallet");
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
              const mappedAssets: Asset[] = data.tokens.map((t: any) => {
                const amount = parseFloat(t.balance) || 0;
                const price = parseFloat(t.priceUsd) || 0;
                const usdValue = (amount * price).toFixed(2);
                const formattedAmount = amount.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 4,
                });
                const displaySymbol =
                  t.symbol === "XLM_TEST" ? "XLM" : t.symbol;
                return {
                  symbol: displaySymbol,
                  name: t.name || t.symbol,
                  icon: t.icon || "/images/home/coin-generic.svg",
                  balance: `$${usdValue}`,
                  change: `${formattedAmount} ${displaySymbol}`,
                };
              });
              setAssets(mappedAssets);
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

      <div className="flex flex-col gap-4 px-4.5 pt-4 pb-27">
        <AssetList assets={assets} />
        {kycComplete ? (
          <PromotionList promotions={PROMOTIONS} />
        ) : (
          <KycCard
            completed={ACCOUNT.kyc.completed}
            total={ACCOUNT.kyc.total}
          />
        )}
        <QuickActions />
        <TransactionHistory transactions={transactions} />
      </div>

      <BottomNav />
    </>
  );
}
