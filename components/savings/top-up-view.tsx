"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AmountScreen } from "@/components/transfer/amount-screen";
import { DetailList, DetailRow } from "@/components/transfer/detail-list";
import { RecipientTag } from "@/components/transfer/recipient-tag";
import { ReviewSheet } from "@/components/transfer/review-sheet";
import { TransferPinSheet } from "@/components/transfer/transfer-pin-sheet";
import { TransferSuccess } from "@/components/transfer/transfer-success";
import type { SavingsPlan } from "@/lib/savings";
import { formatAmount } from "@/lib/transfer";
import type { Promotion } from "@/lib/wallet";

type Sheet = "review" | "pin" | null;

const TOP_UP_AMOUNTS = [25, 50, 100] as const;

/** Move more money into an existing plan: amount, review, PIN, receipt. */
export function TopUpView({
  plan,
  back,
  promotions,
}: {
  plan: SavingsPlan;
  back: string;
  promotions: Promotion[];
}) {
  const router = useRouter();
  const [currentPlan, setCurrentPlan] = useState<SavingsPlan>(plan);
  const [amount, setAmount] = useState("");
  const [sheet, setSheet] = useState<Sheet>(null);
  const [pinError, setPinError] = useState(false);
  const [done, setDone] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdTx, setCreatedTx] = useState<string>();
  const [walletBalance, setWalletBalance] = useState<string>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem("jumpa_last_balance");
        if (cached) {
          const num = parseFloat(cached) || 0;
          return `$${num.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`;
        }
      } catch {}
    }
    return "$0.00";
  });

  useEffect(() => {
    let isMounted = true;
    async function loadBalance() {
      try {
        const res = await fetch("/api/wallet/balance");
        if (!res.ok || !isMounted) return;
        const data = await res.json();
        const totalUsd = parseFloat(data.totalUsd) || 0;
        const usdcTokens =
          data.tokens?.filter((t: any) => t.symbol?.toUpperCase() === "USDC") || [];
        const usdcTotal = usdcTokens.reduce(
          (sum: number, t: any) => sum + (parseFloat(t.balance) || 0),
          0,
        );
        const resolvedUsd = Math.max(totalUsd, usdcTotal);
        const formatted = `$${resolvedUsd.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`;

        try {
          localStorage.setItem("jumpa_last_balance", resolvedUsd.toFixed(2));
        } catch {}

        if (isMounted) {
          setWalletBalance(formatted);
        }
      } catch (err) {
        console.error("Failed to load wallet balance for top-up:", err);
      }
    }
    loadBalance();
    return () => {
      isMounted = false;
    };
  }, []);

  const total = `$${formatAmount(amount)}`;

  const details = (
    <DetailList>
      <DetailRow label="From" value="Jumpa wallet" />
      <DetailRow label="Plan" value={currentPlan.name} />
      <DetailRow label="Saved so far" value={currentPlan.saved} />
      <DetailRow label="Target" value={currentPlan.target} rule={false} />
    </DetailList>
  );

  if (done) {
    return (
      <TransferSuccess
        back={back}
        title="Top up Successful"
        titleFirst
        actionsFirst
        amount={total}
        details={details}
        promotions={promotions}
        ctaLabel="Back to plan"
        ctaHref={back}
      />
    );
  }

  return (
    <>
      <AmountScreen
        recipient={
          <RecipientTag primary={plan.name} secondary={plan.frequency} />
        }
        onClose={() => router.push(back)}
        amount={amount}
        symbol="USDC"
        balance={walletBalance}
        chips={TOP_UP_AMOUNTS}
        chipUnit="USDC"
        onAmountChange={setAmount}
        onReview={() => setSheet("review")}
      />

      {sheet === "review" ? (
        <ReviewSheet
          summary={
            <RecipientTag primary={plan.name} secondary={plan.frequency} />
          }
          headline={total}
          headlineLabel="YOU ARE ADDING"
          confirmLabel="Confirm top up"
          onConfirm={() => setSheet("pin")}
          onClose={() => setSheet(null)}
        >
          {details}
        </ReviewSheet>
      ) : null}

      {sheet === "pin" ? (
        <TransferPinSheet
          error={pinError}
          onRetry={() => setPinError(false)}
          onClose={() => setSheet("review")}
          onComplete={async (pin) => {
            try {
              setIsSubmitting(true);
              const res = await fetch(`/api/savings/top-up?id=${plan.id}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  amount: Number(amount),
                  pin,
                }),
              });

              const data = await res.json();
              if (!res.ok) {
                if (res.status === 401 && data.error?.toLowerCase().includes("pin")) {
                  setPinError(true);
                } else {
                  alert(data.error || "Failed to process top-up");
                }
                return;
              }

              if (data.plan) {
                setCurrentPlan(data.plan);
              } else {
                const prevNum =
                  parseFloat(String(currentPlan.saved).replace(/[^0-9.-]+/g, "")) || 0;
                const newTotal = prevNum + Number(amount);
                setCurrentPlan((prev) => ({
                  ...prev,
                  saved: `$${newTotal.toLocaleString("en-US", {
                    minimumFractionDigits: newTotal % 1 === 0 ? 0 : 2,
                    maximumFractionDigits: 2,
                  })}`,
                }));
              }

              setCreatedTx(data.txHash);
              setDone(true);
            } catch (err: any) {
              alert(err.message || "Network error occurred");
            } finally {
              setIsSubmitting(false);
            }
          }}
        />
      ) : null}
    </>
  );
}
