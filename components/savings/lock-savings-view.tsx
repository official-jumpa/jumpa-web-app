"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChoiceChips } from "@/components/savings/choice-chips";
import { FundingSheet } from "@/components/savings/funding-sheet";
import {
  SAVINGS_INPUT,
  SavingsField,
  SavingsLabel,
} from "@/components/savings/savings-field";
import {
  SavingsForm,
  SavingsPanel,
  SavingsRule,
} from "@/components/savings/savings-form";
import { DetailList, DetailRow } from "@/components/transfer/detail-list";
import { ReviewSheet } from "@/components/transfer/review-sheet";
import { TransferPinSheet } from "@/components/transfer/transfer-pin-sheet";
import { TransferSuccess } from "@/components/transfer/transfer-success";
import { DateField } from "@/components/ui/date-field";
import { FieldError } from "@/components/ui/field-error";
import { CaretDownIcon } from "@/components/ui/icons/caret-down";
import { ChevronRightIcon } from "@/components/ui/icons/chevron-right";
import { DownloadIcon } from "@/components/ui/icons/download";
import { GlobeIcon } from "@/components/ui/icons/globe";
import { SealAlertIcon } from "@/components/ui/icons/seal-alert";
import { ResultSheet } from "@/components/ui/result-sheet";
import { useWalletBalance } from "@/hooks/use-wallet-balance";
import { type FriendlyError, friendlyError } from "@/lib/errors";
import {
  addDays,
  displayDate,
  type FundingSource,
  LOCK_SOURCES,
  LOCK_TERMS,
  longDate,
  shortDate,
} from "@/lib/savings";
import { formatAmount } from "@/lib/transfer";
import { revealFirstError } from "@/lib/validation";

type Sheet = "wallet" | "review" | "pin" | null;
type Errors = { amount?: string; goal?: string; range?: string };

/** Lock an amount away for a fixed term: form, wallet, review, PIN, receipt. */
export function LockSavingsView() {
  const fields = useRef<HTMLDivElement>(null);
  const [amount, setAmount] = useState("");
  const [goal, setGoal] = useState("");
  const [term, setTerm] = useState(LOCK_TERMS[0].label);
  const [from, setFrom] = useState(() => addDays(0));
  const [until, setUntil] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const balance = useWalletBalance();
  const [source, setSource] = useState<FundingSource>();
  const [sheet, setSheet] = useState<Sheet>(null);
  const [pinError, setPinError] = useState(false);
  const [failure, setFailure] = useState<FriendlyError>();

  // Provider errors read like "[DeFindex POST /vault/deposit] Failed (403)";
  // the sheet shows plain copy instead and the raw text goes to the console.
  const fail = (raw?: string) => {
    setFailure(friendlyError(raw, "deposit"));
    setSheet(null);
  };
  const [done, setDone] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdTx, setCreatedTx] = useState<string>();
  const [apyRate, setApyRate] = useState<number>(0);

  useEffect(() => {
    let isMounted = true;
    async function loadApy() {
      try {
        const res = await fetch("/api/savings?type=lock");
        if (res.ok && isMounted) {
          const data = await res.json();
          if (
            typeof data.summary?.apyValue === "number" &&
            data.summary.apyValue > 0
          ) {
            setApyRate(data.summary.apyValue);
          } else if (data.summary?.apy) {
            const parsed = parseFloat(data.summary.apy);
            if (!isNaN(parsed) && parsed > 0) {
              setApyRate(parsed);
            } else {
              setApyRate(0);
            }
          } else {
            setApyRate(0);
          }
        }
      } catch (err) {
        if (isMounted) setApyRate(0);
      }
    }
    loadApy();
    return () => {
      isMounted = false;
    };
  }, []);

  const custom = term === "Custom";
  const days = LOCK_TERMS.find((option) => option.label === term)?.days ?? null;
  const customDays =
    custom && from && until
      ? Math.max(
          1,
          Math.round(
            (new Date(until.replace(/-/g, "/")).getTime() -
              new Date(from.replace(/-/g, "/")).getTime()) /
              (1000 * 60 * 60 * 24),
          ),
        )
      : 0;
  const lockDays = custom ? customDays : (days ?? 30);
  const maturity = custom ? until : days ? addDays(days) : "";
  const total = `$${formatAmount(amount)}`;

  const principal = parseFloat(amount) || 0;
  const estimatedYield =
    lockDays > 0 ? (principal * (apyRate / 100) * lockDays) / 365 : 0;

  const clear = (field: keyof Errors) =>
    setErrors((current) => ({ ...current, [field]: undefined }));

  const submit = () => {
    const next: Errors = {};
    const today = addDays(0);
    // Caught here rather than by the vault, which answers a 403 that says nothing.
    if (!Number(amount)) next.amount = "Enter the amount you want to lock";
    else if (balance.ready && Number(amount) > balance.usdc)
      next.amount = `You have ${balance.formatted} available. Lower the amount or add funds first.`;
    if (!goal.trim()) next.goal = "Tell us what you are saving for";
    if (custom && (!from || !until))
      next.range = "Pick the start and end of your lock";
    else if (custom && from < today)
      next.range = "Start date cannot be in the past";
    else if (custom && until <= from)
      next.range = "The end date has to come after the start date";

    setErrors(next);
    if (Object.values(next).some(Boolean)) {
      revealFirstError(fields.current);
      return;
    }
    setSheet("wallet");
  };

  const details = (
    <DetailList>
      <DetailRow label="Name" value={goal} />
      <DetailRow label="Unlock date" value={longDate(maturity)} />
      <DetailRow label="Lock duration" value={`${lockDays} days`} />
      <DetailRow label="Funding source" value={source?.label ?? ""} />
      <DetailRow
        label="Estimated yield"
        value={
          <span className="text-jumpa-primary-400">
            {formatAmount(estimatedYield.toFixed(2))} USDC
          </span>
        }
      />
    </DetailList>
  );

  if (done) {
    return (
      <TransferSuccess
        compact
        back="/savings/lock"
        title="Successful"
        titleFirst
        amount={`${total} locked`}
        note={
          <>
            Your savings is now locked until <b>{longDate(maturity)}.</b>
          </>
        }
        actions={
          <Link
            prefetch
            href="/savings/lock"
            className="tap flex h-16 w-full items-center justify-between rounded-surface border border-jumpa-neutral-60 bg-jumpa-neutral-50 px-6 text-xs leading-3.5 text-jumpa-black active:scale-[0.99]"
          >
            <span className="flex items-center gap-2">
              <DownloadIcon className="size-6 text-jumpa-primary-600" />
              View savings
            </span>
            <ChevronRightIcon className="size-5" />
          </Link>
        }
        ctaLabel="Back to home"
        ctaHref="/home"
      />
    );
  }

  return (
    <>
      <SavingsForm
        back="/savings/lock"
        title="Lock funds"
        cta="Continue"
        ctaVariant="gradientSheet"
        fields={fields}
        onSubmit={submit}
      >
        <SavingsField label="How much do you want to lock?" error={errors.amount}>
          <input
            value={amount}
            onChange={(event) => {
              setAmount(event.target.value.replace(/[^\d.]/g, ""));
              clear("amount");
            }}
            inputMode="decimal"
            placeholder="Enter amount e.g $1000"
            aria-invalid={Boolean(errors.amount)}
            className={SAVINGS_INPUT}
          />
        </SavingsField>

        <SavingsField label="What are you saving for?" error={errors.goal}>
          <input
            value={goal}
            onChange={(event) => {
              setGoal(event.target.value);
              clear("goal");
            }}
            placeholder="December trip"
            aria-invalid={Boolean(errors.goal)}
            className={SAVINGS_INPUT}
          />
        </SavingsField>

        <SavingsPanel>
          <div className="flex flex-col gap-3">
            <SavingsLabel>How long do you want to lock it?</SavingsLabel>
            <ChoiceChips
              options={LOCK_TERMS.map((option) => option.label)}
              value={term}
              onChange={(next) => {
                setTerm(next);
                clear("range");
              }}
            />
          </div>

          {custom ? (
            <div className="flex flex-col gap-3">
              <SavingsLabel>Lock period</SavingsLabel>
              <div className="flex items-center gap-2">
                <DateField
                  className="min-w-0 flex-1"
                  label="Start date"
                  value={from}
                  min={addDays(0)}
                  invalid={Boolean(errors.range)}
                  onChange={(next) => {
                    setFrom(next);
                    clear("range");
                  }}
                />
                <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-jumpa-primary-600 text-[8px] leading-none font-semibold text-jumpa-white">
                  to
                </span>
                <DateField
                  className="min-w-0 flex-1"
                  label="End date"
                  value={until}
                  min={from || addDays(0)}
                  invalid={Boolean(errors.range)}
                  onChange={(next) => {
                    setUntil(next);
                    clear("range");
                  }}
                />
              </div>
              <FieldError>{errors.range}</FieldError>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <SavingsLabel>Maturity date</SavingsLabel>
              <span className="flex h-11.5 items-center gap-2 rounded-surface border border-jumpa-grey-100 bg-jumpa-white px-3 text-sm leading-4 font-medium text-jumpa-primary-950">
                <GlobeIcon className="size-6 shrink-0 text-jumpa-primary-950" />
                <span className="flex-1">{displayDate(maturity)}</span>
                <CaretDownIcon className="size-6 shrink-0 text-jumpa-primary-950" />
              </span>
            </div>
          )}

          <SavingsRule />

          <div className="flex items-center justify-between px-2.5">
            <span className="text-[10px] leading-4 text-jumpa-black/50">
              Estimated yield: +${formatAmount(estimatedYield.toFixed(2))}
              {apyRate > 0 ? ` (${apyRate.toFixed(1)}% p.a.)` : ""}
            </span>
            <span className="text-xs leading-5 font-medium text-jumpa-black">
              {maturity
                ? `Unlocks ${shortDate(maturity)}`
                : "Select lock period"}
            </span>
          </div>
        </SavingsPanel>

        <p className="flex items-center gap-2 text-xs leading-3.5 text-jumpa-warning">
          <SealAlertIcon className="size-6 shrink-0" />
          Your money will remain locked until{" "}
          {maturity ? longDate(maturity) : "the maturity date"}.
        </p>
      </SavingsForm>

      {sheet === "wallet" ? (
        <FundingSheet
          sources={LOCK_SOURCES}
          note="You won't be able to withdraw these funds before the unlock date."
          onClose={() => setSheet(null)}
          onContinue={(picked) => {
            setSource(picked);
            setSheet("review");
          }}
        />
      ) : null}

      {sheet === "review" ? (
        <ReviewSheet
          headline={`${formatAmount(amount)} USDC`}
          headlineLabel="AMOUNT"
          onConfirm={() => setSheet("pin")}
          onClose={() => setSheet(null)}
        >
          {details}
        </ReviewSheet>
      ) : null}

      {sheet === "pin" ? (
        <TransferPinSheet
          error={pinError}
          pending={isSubmitting}
          onRetry={() => setPinError(false)}
          onClose={() => setSheet("review")}
          onComplete={async (pin) => {
            try {
              setIsSubmitting(true);
              const res = await fetch("/api/savings/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  kind: "lock",
                  name: goal,
                  targetAmount: Number(amount),
                  depositAmount: Number(amount),
                  term: custom ? "Custom" : term,
                  startDate: custom ? from : new Date().toISOString(),
                  endDate: maturity,
                  frequency: "Manual",
                  fundingSource: source?.id || "crypto",
                  pin,
                }),
              });

              const data = await res.json();
              if (!res.ok) {
                if (
                  res.status === 401 &&
                  data.error?.toLowerCase().includes("pin")
                ) {
                  setPinError(true);
                } else {
                  fail(data.error || "Failed to lock savings");
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
