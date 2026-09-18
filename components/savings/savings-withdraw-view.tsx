"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { EmptyPlans } from "@/components/savings/empty-plans";
import { PlanCard } from "@/components/savings/plan-card";
import {
  SAVINGS_INPUT,
  SavingsField,
} from "@/components/savings/savings-field";
import { DetailList, DetailRow } from "@/components/transfer/detail-list";
import { RecipientTag } from "@/components/transfer/recipient-tag";
import { ReviewSheet } from "@/components/transfer/review-sheet";
import { TransferHeader } from "@/components/transfer/transfer-header";
import { TransferPinSheet } from "@/components/transfer/transfer-pin-sheet";
import { TransferSuccess } from "@/components/transfer/transfer-success";
import { useGoBack } from "@/components/ui/back-link";
import { Button } from "@/components/ui/button";
import { ResultSheet } from "@/components/ui/result-sheet";
import { type FriendlyError, friendlyError } from "@/lib/errors";
import {
  type SavingsPlan,
  savingsHref,
  WITHDRAW_PERCENTAGES,
} from "@/lib/savings";
import { formatAmount, sanitiseAmount } from "@/lib/transfer";

type Sheet = "review" | "pin" | null;

export function SavingsWithdrawView() {
  const searchParams = useSearchParams();
  const planId = searchParams.get("id");
  const paramName = searchParams.get("name");
  const paramSaved = searchParams.get("saved");
  const paramKind = (searchParams.get("kind") as any) || "individual";
  const paramDaysLeft = Number(searchParams.get("daysLeft")) || 0;

  const [plans, setPlans] = useState<SavingsPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<SavingsPlan | null>(() => {
    if (planId && paramName && paramSaved) {
      return {
        id: planId,
        name: paramName,
        saved: paramSaved,
        kind: paramKind,
        daysLeft: paramDaysLeft,
        target: "$0.00",
        endDate: "",
        status: "Active",
        percent: 0,
        startDate: "",
        endDateLong: "",
        frequency: "",
      };
    }
    return null;
  });
  const [hasFetched, setHasFetched] = useState(false);
  const [amount, setAmount] = useState("");
  const [amountError, setAmountError] = useState<string>();
  const [sheet, setSheet] = useState<Sheet>(null);
  const [pinError, setPinError] = useState(false);
  const [failure, setFailure] = useState<FriendlyError>();

  // Provider errors read like "[DeFindex POST /vault/deposit] Failed (403)";
  // the sheet shows plain copy instead and the raw text goes to the console.
  const fail = (raw?: string) => {
    setFailure(friendlyError(raw, "withdrawal"));
    setSheet(null);
  };
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [createdTx, setCreatedTx] = useState<string>();

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        if (planId) {
          // Fetch specific plan details via API
          const res = await fetch(`/api/savings/details?id=${planId}`);
          if (res.ok && isMounted) {
            const data = await res.json();
            if (data.plan) {
              setSelectedPlan(data.plan);
            }
          }
        }

        // Also fetch user's savings plans list via API
        const listRes = await fetch("/api/savings");
        if (listRes.ok && isMounted) {
          const listData = await listRes.json();
          const fetchedPlans: SavingsPlan[] = listData.plans || [];
          setPlans(fetchedPlans);

          setSelectedPlan((current) => {
            if (current) return current;
            if (planId) {
              const matched = fetchedPlans.find((p) => p.id === planId);
              if (matched) return matched;
            }
            if (fetchedPlans.length === 1) {
              return fetchedPlans[0];
            }
            return null;
          });
        }
      } catch (err) {
        console.error("Failed to load savings for withdrawal:", err);
      } finally {
        if (isMounted) setHasFetched(true);
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [planId]);

  // Numerical calculations
  const numAmount = parseFloat(amount) || 0;
  const isEarlyLock =
    selectedPlan?.kind === "lock" &&
    typeof selectedPlan.daysLeft === "number" &&
    selectedPlan.daysLeft > 0;

  const penaltyPercent = isEarlyLock ? 5 : 0;
  const penaltyFee = numAmount * (penaltyPercent / 100);
  const netPayout = Math.max(0, numAmount - penaltyFee);

  const payoutTotal = `$${formatAmount(netPayout.toFixed(2))}`;

  const savedNum =
    Number(String(selectedPlan?.saved || "0").replace(/[^\d.]/g, "")) || 0;

  const applyPercent = (pct: number) => {
    const next = (savedNum * pct) / 100;
    setAmount(next % 1 === 0 ? String(next) : next.toFixed(2));
    setAmountError(undefined);
  };

  const activePercent = WITHDRAW_PERCENTAGES.find(
    (pct) =>
      savedNum > 0 && Math.abs((savedNum * pct) / 100 - numAmount) < 0.005,
  );

  const proceed = () => {
    if (!numAmount) {
      setAmountError("Enter an amount greater than 0");
      return;
    }
    if (numAmount > savedNum) {
      setAmountError(
        `Your balance is ${selectedPlan?.saved}. Enter less than that.`,
      );
      return;
    }
    setAmountError(undefined);
    setSheet("review");
  };

  const details = selectedPlan ? (
    <DetailList>
      <DetailRow label="From" value={selectedPlan.name} />
      <DetailRow label="To" value="Jumpa wallet" />
      <DetailRow label="Gross amount" value={`$${formatAmount(amount)}`} />
      {penaltyFee > 0 && (
        <DetailRow
          label="Early break fee (5%)"
          value={`-$${penaltyFee.toFixed(2)}`}
        />
      )}
      <DetailRow
        label="Net payout to wallet"
        value={payoutTotal}
        rule={false}
      />
    </DetailList>
  ) : null;

  const backUrl = selectedPlan
    ? savingsHref(selectedPlan.kind, { id: selectedPlan.id })
    : "/savings";

  const goBack = useGoBack(backUrl);

  if (done) {
    return (
      <TransferSuccess
        back={backUrl}
        title="Withdrawal Complete"
        titleFirst
        actionsFirst
        amount={payoutTotal}
        details={details}
        ctaLabel="Back to savings"
        ctaHref="/savings"
      />
    );
  }

  // If no plan is preselected and user hasn't chosen one:
  // Show plan selector immediately or empty state once fetch concludes
  if (!planId && !selectedPlan) {
    if (hasFetched && plans.length === 0) {
      return (
        <div className="flex min-h-dvh flex-col px-4.5 pt-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
          <TransferHeader back="/savings" title="Withdraw savings" />
          <div className="mt-8">
            <EmptyPlans
              title="No savings plans found"
              caption="You don't have any active savings to withdraw from yet."
            />
          </div>
        </div>
      );
    }

    return (
      <div className="flex min-h-dvh flex-col px-4.5 pt-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
        <TransferHeader back="/savings" title="Select plan to withdraw" />
        <section className="mt-4 flex flex-col gap-3">
          <h2 className="text-xs font-medium text-jumpa-black">
            Available plans
          </h2>
          {plans.map((p) => (
            <div
              key={p.id}
              onClick={() => setSelectedPlan(p)}
              className="cursor-pointer transition hover:opacity-95"
            >
              <PlanCard plan={p} href="#" />
            </div>
          ))}
        </section>
      </div>
    );
  }

  // Instant render: the amount screen is up immediately with zero spinner.
  return (
    <>
      <div className="flex min-h-dvh flex-col px-4.5 pt-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
        <TransferHeader
          back={backUrl}
          // Picked in the selector? Go back to it. The plan detail page it
          // would otherwise land on is one this route never came from.
          onBack={() => (planId ? goBack() : setSelectedPlan(null))}
          title="Withdraw savings"
        />

        <div className="mt-6 flex flex-col gap-5">
          <SavingsField label="Amount" error={amountError}>
            <span className="text-xs leading-4 font-medium text-jumpa-primary-950">
              $
            </span>
            <input
              value={amount}
              onChange={(event) => {
                setAmount(sanitiseAmount(event.target.value));
                setAmountError(undefined);
              }}
              inputMode="decimal"
              placeholder="0.00"
              aria-invalid={Boolean(amountError)}
              className={SAVINGS_INPUT}
            />
          </SavingsField>

          <div className="flex gap-2">
            {WITHDRAW_PERCENTAGES.map((pct) => {
              const active = pct === activePercent;
              return (
                <button
                  key={pct}
                  type="button"
                  aria-pressed={active}
                  onClick={() => applyPercent(pct)}
                  className={`tap flex h-9 flex-1 items-center justify-center rounded-pill text-xs leading-4 font-medium active:scale-95 ${
                    active
                      ? "bg-jumpa-primary-600 text-jumpa-primary-50"
                      : "border-[1.32px] border-jumpa-primary-100 bg-jumpa-primary-50 text-jumpa-primary-950"
                  }`}
                >
                  {pct}%
                </button>
              );
            })}
          </div>

          <p className="text-xs leading-4 font-medium text-jumpa-neutral-400">
            Current saving balance: {selectedPlan?.saved || "$0.00"}
          </p>

          <DetailList>
            {/* Nominal figures from the frame — no fee-estimation API exists yet. */}
            <DetailRow label="Breaking fee" value="0.001 XLM (~$0.001)" />
            {penaltyFee > 0 ? (
              <DetailRow
                label="Early withdrawal fee (5%)"
                value={`-$${penaltyFee.toFixed(2)}`}
              />
            ) : null}
            <DetailRow label="Slippage" value="0.5%" rule={false} />
          </DetailList>
        </div>

        <div className="mt-auto pt-8">
          <Button variant="gradient" size="lg" onClick={proceed}>
            Continue
          </Button>
        </div>
      </div>

      {sheet === "review" && selectedPlan ? (
        <ReviewSheet
          summary={
            <RecipientTag
              primary="Jumpa wallet"
              secondary={`From: ${selectedPlan.name}`}
            />
          }
          headline={payoutTotal}
          headlineLabel={
            penaltyFee > 0 ? "ESTIMATED NET PAYOUT" : "YOU ARE WITHDRAWING"
          }
          onConfirm={() => setSheet("pin")}
          onClose={() => setSheet(null)}
        >
          {details}
        </ReviewSheet>
      ) : null}

      {sheet === "pin" && selectedPlan ? (
        <TransferPinSheet
          error={pinError}
          pending={isSubmitting}
          onRetry={() => setPinError(false)}
          onClose={() => setSheet("review")}
          onComplete={async (pin) => {
            try {
              setIsSubmitting(true);
              const res = await fetch(
                `/api/savings/withdraw?id=${selectedPlan.id}`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    amount: numAmount,
                    pin,
                  }),
                },
              );

              const data = await res.json();
              if (!res.ok) {
                if (
                  res.status === 401 &&
                  data.error?.toLowerCase().includes("pin")
                ) {
                  setPinError(true);
                } else {
                  fail(data.error || "Failed to process withdrawal");
                }
                return;
              }

              setCreatedTx(data.txHash);
              setDone(true);
            } catch (err: any) {
              fail(err?.message);
            } finally {
              setIsSubmitting(false);
            }
          }}
        />
      ) : null}

      {failure ? (
        <ResultSheet
          title={failure.title}
          message={failure.message}
          onRetry={
            failure.retry
              ? () => {
                  setFailure(undefined);
                  setSheet("review");
                }
              : undefined
          }
          onClose={() => setFailure(undefined)}
        />
      ) : null}
    </>
  );
}
