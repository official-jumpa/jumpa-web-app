import { AssetList } from "@/components/home/asset-list";
import { BalancePanel } from "@/components/home/balance-panel";
import { HeroBackdrop } from "@/components/home/hero-backdrop";
import { KycCard } from "@/components/home/kyc-card";
import { PromotionList } from "@/components/home/promotion-list";
import { QuickActions } from "@/components/home/quick-actions";
import { TransactionHistory } from "@/components/home/transaction-history";
import { WalletHeader } from "@/components/home/wallet-header";
import { ACCOUNT, ASSETS, PROMOTIONS, TRANSACTIONS } from "@/lib/wallet";

export default function HomePage() {
  const kycComplete = ACCOUNT.kyc.completed >= ACCOUNT.kyc.total;

  return (
    <>
      {/* Hero band. Bleeds under the notch, so its top padding carries the inset. */}
      <div className="relative isolate flex flex-col gap-6 border-b border-jumpa-primary-950 bg-[image:var(--gradient-jumpa-hero)] px-4.5 pt-[calc(env(safe-area-inset-top)+1rem)] pb-6">
        <HeroBackdrop />
        <WalletHeader />
        <BalancePanel balance={ACCOUNT.balance} />
      </div>

      <div className="flex flex-col gap-4 px-4.5 pt-4 pb-27">
        <AssetList assets={ASSETS} />
        {kycComplete ? (
          <PromotionList promotions={PROMOTIONS} />
        ) : (
          <KycCard
            completed={ACCOUNT.kyc.completed}
            total={ACCOUNT.kyc.total}
          />
        )}
        <QuickActions />
        <TransactionHistory transactions={TRANSACTIONS} />
      </div>
    </>
  );
}
