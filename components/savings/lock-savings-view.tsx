"use client";

import { useRef, useState } from "react";
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
import { RecipientTag } from "@/components/transfer/recipient-tag";
import { ReviewSheet } from "@/components/transfer/review-sheet";
import { TransferPinSheet } from "@/components/transfer/transfer-pin-sheet";
import { TransferSuccess } from "@/components/transfer/transfer-success";
import { DateField } from "@/components/ui/date-field";
import { FieldError } from "@/components/ui/field-error";
import { CaretDownIcon } from "@/components/ui/icons/caret-down";
import { GlobeIcon } from "@/components/ui/icons/globe";
import { SealAlertIcon } from "@/components/ui/icons/seal-alert";
import {
  addDays,
  displayDate,
  type FundingSource,
  LOCK_SOURCES,
  LOCK_TERMS,
  shortDate,
} from "@/lib/savings";
import { DEMO_PIN, formatAmount } from "@/lib/transfer";
import { revealFirstError } from "@/lib/validation";
import type { Promotion } from "@/lib/wallet";

type Sheet = "wallet" | "review" | "pin" | null;
type Errors = { amount?: string; goal?: string; range?: string };

/** Lock an amount away for a fixed term: form, wallet, review, PIN, receipt. */
export function LockSavingsView({ promotions }: { promotions: Promotion[] }) {
  const fields = useRef<HTMLDivElement>(null);
  const [amount, setAmount] = useState("");
  const [goal, setGoal] = useState("");
  const [term, setTerm] = useState(LOCK_TERMS[0].label);
  const [from, setFrom] = useState("");
  const [until, setUntil] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [source, setSource] = useState<FundingSource>();
  const [sheet, setSheet] = useState<Sheet>(null);
  const [pinError, setPinError] = useState(false);
  const [done, setDone] = useState(false);

  const custom = term === "Custom";
  const days = LOCK_TERMS.find((option) => option.label === term)?.days ?? null;
  const maturity = custom ? until : days ? addDays(days) : "";
  const total = `$${formatAmount(amount)}`;

  const clear = (field: keyof Errors) =>
    setErrors((current) => ({ ...current, [field]: undefined }));

  const submit = () => {
    const next: Errors = {};
    if (!Number(amount)) next.amount = "Enter the amount you want to lock";
    if (!goal.trim()) next.goal = "Tell us what you are saving for";
    if (custom && (!from || !until))
      next.range = "Pick the start and end of your lock";
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
      <DetailRow label="Goal" value={goal} />
      <DetailRow label="Duration" value={custom ? "Custom" : term} />
      <DetailRow label="Maturity date" value={displayDate(maturity)} />
      <DetailRow label="From" value={source?.label ?? ""} rule={false} />
    </DetailList>
  );

  if (done) {
    return (
      <TransferSuccess
        back="/savings/lock"
        title="Locked Successfully"
        titleFirst
        actionsFirst
        amount={total}
        details={details}
        promotions={promotions}
        ctaLabel="Back to savings"
        ctaHref="/savings/lock"
      />
    );
  }

  return (
    <>
      <SavingsForm
        back="/savings/lock"
        title="Lock savings"
        cta="Continue"
        fields={fields}
        onSubmit={submit}
      >
        <SavingsField label="Amount" error={errors.amount}>
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

        <SavingsField label="Goal name" error={errors.goal}>
          <input
            value={goal}
            onChange={(event) => {
              setGoal(event.target.value);
              clear("goal");
            }}
            placeholder="What are you saving for?"
            aria-invalid={Boolean(errors.goal)}
            className={SAVINGS_INPUT}
          />
        </SavingsField>

        <SavingsPanel>
          <div className="flex flex-col gap-3">
            <SavingsLabel>Lock duration</SavingsLabel>
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
              <span className="flex h-11.5 items-center gap-2 rounded-surface border border-jumpa-grey-100 bg-jumpa-white px-3 text-xs leading-4 font-medium text-jumpa-primary-950">
                <GlobeIcon className="size-4.5 shrink-0 text-jumpa-primary-600" />
                <span className="flex-1">{displayDate(maturity)}</span>
                <CaretDownIcon className="size-3 shrink-0 text-jumpa-primary-950" />
              </span>
            </div>
          )}

          <SavingsRule />

          <div className="flex items-center justify-between text-[10px] leading-3.5 font-medium text-jumpa-primary-950">
            <span>
              Estimated yield: <span className="font-bold">+$Interest</span>
            </span>
            <span>Unlocks {shortDate(maturity)}</span>
          </div>
        </SavingsPanel>

        <p className="flex items-start gap-2 text-[10px] leading-3.5 font-medium text-jumpa-warning">
          <SealAlertIcon className="size-3.5 shrink-0" />
          Funds stay locked until the maturity date. Breaking a lock early costs
          a 5% fee.
        </p>
      </SavingsForm>

      {sheet === "wallet" ? (
        <FundingSheet
          sources={LOCK_SOURCES}
          note="Locked funds cannot be spent until they mature."
          onClose={() => setSheet(null)}
          onContinue={(picked) => {
            setSource(picked);
            setSheet("review");
          }}
        />
      ) : null}

      {sheet === "review" ? (
        <ReviewSheet
          summary={<RecipientTag primary={goal} secondary={`${term} lock`} />}
          headline={total}
          headlineLabel="YOU ARE LOCKING"
          confirmLabel="Confirm lock"
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
          onComplete={(pin) => {
            if (pin === DEMO_PIN) setDone(true);
            else setPinError(true);
          }}
        />
      ) : null}
    </>
  );
}

/** One half of the custom lock range. */
