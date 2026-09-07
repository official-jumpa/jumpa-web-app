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
import { ResultSheet } from "@/components/ui/result-sheet";
import { Select } from "@/components/ui/select";
import { useWalletBalance } from "@/hooks/use-wallet-balance";
import { type FriendlyError, friendlyError } from "@/lib/errors";
import {
  addDays,
  displayDate,
  type FundingSource,
  SAVINGS_CATEGORIES,
  SAVINGS_FREQUENCIES,
  TARGET_SOURCES,
  TARGET_TERMS,
  WEEKDAYS,
} from "@/lib/savings";
import { formatAmount } from "@/lib/transfer";
import { revealFirstError } from "@/lib/validation";
import type { Promotion } from "@/lib/wallet";

type Stage = "goal" | "money" | "done";
type Sheet = "wallet" | "review" | "pin" | null;
type Errors = {
  goal?: string;
  target?: string;
  dates?: string;
  day?: string;
  deposit?: string;
};

const MONTH_DAYS = Array.from({ length: 28 }, (_, index) => `${index + 1}`);

/** A personal target: what you are saving for, then how you will fund it. */
export function CreateTargetView({ promotions }: { promotions: Promotion[] }) {
  const fields = useRef<HTMLDivElement>(null);
  const [stage, setStage] = useState<Stage>("goal");
  const [goal, setGoal] = useState("");
  const [category, setCategory] = useState(SAVINGS_CATEGORIES[0]);
  const [target, setTarget] = useState("");
  const [term, setTerm] = useState(TARGET_TERMS[0].label);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [deposit, setDeposit] = useState("");
  const [frequency, setFrequency] = useState(SAVINGS_FREQUENCIES[1]);
  const [day, setDay] = useState("");
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdTx, setCreatedTx] = useState<string>();

  const days = TARGET_TERMS.find((option) => option.label === term)?.days;
  const openEnded = days === null;
  const endDate = openEnded ? "" : end || addDays(days ?? 0);
  const total = `$${formatAmount(target)}`;

  const clear = (field: keyof Errors) =>
    setErrors((current) => ({ ...current, [field]: undefined }));

  const submitGoal = () => {
    const next: Errors = {};
    if (!goal.trim()) next.goal = "Tell us what you are saving for";
    if (!Number(target)) next.target = "Enter the amount you are saving toward";
    if (!openEnded && !start) next.dates = "Pick the day your plan starts";

    setErrors(next);
    if (Object.values(next).some(Boolean)) {
      revealFirstError(fields.current);
      return;
    }
    setStage("money");
  };

  const submitMoney = () => {
    const next: Errors = {};
    // Caught here rather than by the vault, which answers a 403 that says nothing.
    const depositing = Number.parseFloat(deposit) || 0;
    if (balance.ready && depositing > balance.usdc)
      next.deposit = `You have ${balance.formatted} available. Lower the amount or add funds first.`;
    if (frequency !== "Daily" && !day)
      next.day = `Pick the ${frequency === "Weekly" ? "day" : "date"} we should debit you`;

    setErrors(next);
    if (next.deposit || next.day) {
      revealFirstError(fields.current);
      return;
    }
    setSheet("wallet");
  };

  const schedule =
    frequency === "Daily" ? "Daily" : `${day || "—"}, ${frequency}`;

  const details = (
    <DetailList>
      <DetailRow label="Goal" value={goal} />
      <DetailRow label="Category" value={category} />
      <DetailRow label="Frequency" value={schedule} />
      <DetailRow
        label="End date"
        value={openEnded ? "No deadline" : displayDate(endDate)}
        rule={false}
      />
    </DetailList>
  );

  if (stage === "done") {
    return (
      <TransferSuccess
        back="/savings/individual"
        title="Target created"
        titleFirst
        actionsFirst
        amount={total}
        details={details}
        promotions={promotions}
        ctaLabel="Back to savings"
        ctaHref="/savings/individual"
      />
    );
  }

  if (stage === "goal") {
    return (
      <SavingsForm
        back="/savings/individual"
        title="Create savings"
        cta="Continue"
        fields={fields}
        onSubmit={submitGoal}
      >
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

        <div className="flex flex-col gap-3">
          <SavingsLabel>Category</SavingsLabel>
          <ChoiceChips
            options={SAVINGS_CATEGORIES}
            value={category}
            onChange={setCategory}
          />
        </div>

        <SavingsField label="Target amount" error={errors.target}>
          <input
            value={target}
            onChange={(event) => {
              setTarget(event.target.value.replace(/[^\d.]/g, ""));
              clear("target");
            }}
            inputMode="decimal"
            placeholder="Enter amount e.g $1000"
            aria-invalid={Boolean(errors.target)}
            className={SAVINGS_INPUT}
          />
        </SavingsField>

        <SavingsPanel>
          <div className="flex flex-col gap-3">
            <SavingsLabel>Duration</SavingsLabel>
            <ChoiceChips
              options={TARGET_TERMS.map((option) => option.label)}
              value={term}
              onChange={(next) => {
                setTerm(next);
                clear("dates");
              }}
            />
          </div>

          {openEnded ? null : (
            <>
              <SavingsRule />
              <div className="flex flex-col gap-3">
                <SavingsLabel>Start date</SavingsLabel>
                <DateField
                  label="Start date"
                  value={start}
                  invalid={Boolean(errors.dates)}
                  onChange={(next) => {
                    setStart(next);
                    clear("dates");
                  }}
                />
                <FieldError>{errors.dates}</FieldError>
              </div>

              <div className="flex flex-col gap-3">
                <SavingsLabel>End date</SavingsLabel>
                <DateField
                  label="End date"
                  value={endDate}
                  invalid={false}
                  onChange={setEnd}
                />
              </div>
            </>
          )}
        </SavingsPanel>
      </SavingsForm>
    );
  }

  return (
    <>
      {/* Stage 2 lives at the same URL as stage 1, so plain history would leave
          the flow and re-entering would restart it with the fields blank. */}
      <SavingsForm
        back="/savings/individual"
        onBack={() => setStage("goal")}
        title="Add Money"
        cta="Continue"
        fields={fields}
        onSubmit={submitMoney}
      >
        <SavingsField label="Amount (optional)" error={errors.deposit}>
          <input
            value={deposit}
            onChange={(event) => {
              setDeposit(event.target.value.replace(/[^\d.]/g, ""));
              clear("deposit");
            }}
            inputMode="decimal"
            placeholder="Enter amount e.g $1000"
            aria-invalid={Boolean(errors.deposit)}
            className={SAVINGS_INPUT}
          />
        </SavingsField>

        {(() => {
          const depNum = parseFloat(deposit) || 0;
          const tgtNum = parseFloat(target) || 1;
          const pct = Math.min(100, Math.round((depNum / tgtNum) * 100));
          return (
            <div className="flex flex-col gap-2">
              <div className="h-1 w-full overflow-hidden bg-jumpa-primary-200">
                <div
                  className="h-full bg-jumpa-primary-400 transition-all duration-300"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] leading-3.5 font-medium text-jumpa-black">
                <span>
                  Initial deposit:{" "}
                  <span className="font-bold">
                    ${formatAmount(depNum.toFixed(2))}
                  </span>
                  {pct > 0 ? ` (${pct}%)` : ""}
                </span>
                <span>
                  Target: <span className="font-bold">{total}</span>
                </span>
              </div>
            </div>
          );
        })()}

        <SavingsPanel>
          <div className="flex flex-col gap-3">
            <SavingsLabel>How often?</SavingsLabel>
            <ChoiceChips
              options={SAVINGS_FREQUENCIES}
              value={frequency}
              onChange={(next) => {
                setFrequency(next);
                setDay("");
                clear("day");
              }}
            />
          </div>

          {frequency === "Daily" ? null : (
            <div className="flex flex-col gap-3">
              <SavingsLabel>
                {frequency === "Weekly" ? "Select day" : "Select date"}
              </SavingsLabel>
              <Select
                variant="savings"
                label={frequency === "Weekly" ? "Select day" : "Select date"}
                placeholder={
                  frequency === "Weekly" ? "Select day" : "Select date"
                }
                value={day}
                invalid={Boolean(errors.day)}
                onValueChange={(next) => {
                  setDay(next);
                  clear("day");
                }}
                options={(frequency === "Weekly" ? WEEKDAYS : MONTH_DAYS).map(
                  (option) => ({ value: option, label: option }),
                )}
              />
              <FieldError>{errors.day}</FieldError>
            </div>
          )}

          <SavingsRule />

          <p className="text-[10px] leading-3.5 font-medium text-jumpa-primary-600">
            {frequency === "Daily"
              ? "We will move money into this goal every day until you reach your target."
              : `We will move money into this goal every ${day || "chosen day"} until you reach your target.`}
          </p>
        </SavingsPanel>
      </SavingsForm>

      {sheet === "wallet" ? (
        <FundingSheet
          sources={TARGET_SOURCES}
          note="Money moves out of the wallet you pick on every scheduled date."
          rule={{
            label: "Add savings rule",
            onClick: () => setSheet(null),
          }}
          onClose={() => setSheet(null)}
          onContinue={(picked) => {
            setSource(picked);
            setSheet("review");
          }}
        />
      ) : null}

      {sheet === "review" ? (
        <ReviewSheet
          summary={<RecipientTag primary={goal} secondary={schedule} />}
          headline={total}
          headlineLabel="YOUR TARGET"
          confirmLabel="Create target"
          onConfirm={() => setSheet("pin")}
          onClose={() => setSheet(null)}
        >
          <DetailList>
            <DetailRow label="Goal" value={goal} />
            <DetailRow label="Category" value={category} />
            <DetailRow label="Frequency" value={schedule} />
            <DetailRow label="From" value={source?.label ?? ""} rule={false} />
          </DetailList>
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
                  kind: "individual",
                  name: goal,
                  category,
                  targetAmount: Number(target),
                  depositAmount: Number(deposit) || 0,
                  term,
                  startDate: start || new Date().toISOString(),
                  endDate: openEnded ? null : endDate,
                  frequency,
                  debitDay: day || null,
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
                  fail(data.error || "Failed to create target");
                }
                return;
              }

              setCreatedTx(data.txHash);
              setStage("done");
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

/** Bordered date field, matching the savings form shell. */
