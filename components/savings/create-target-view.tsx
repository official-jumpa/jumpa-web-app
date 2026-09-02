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
import { FieldError } from "@/components/ui/field-error";
import { Select } from "@/components/ui/select";
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
import { DEMO_PIN, formatAmount } from "@/lib/transfer";
import { revealFirstError } from "@/lib/validation";
import type { Promotion } from "@/lib/wallet";

type Stage = "goal" | "money" | "done";
type Sheet = "wallet" | "review" | "pin" | null;
type Errors = { goal?: string; target?: string; dates?: string; day?: string };

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
  const [source, setSource] = useState<FundingSource>();
  const [sheet, setSheet] = useState<Sheet>(null);
  const [pinError, setPinError] = useState(false);

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
    if (frequency !== "Daily" && !day)
      next.day = `Pick the ${frequency === "Weekly" ? "day" : "date"} we should debit you`;

    setErrors(next);
    if (next.day) {
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
                <DateInput
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
                <DateInput
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
      <SavingsForm
        back="/savings/individual"
        title="Add Money"
        cta="Continue"
        fields={fields}
        onSubmit={submitMoney}
      >
        <SavingsField label="Amount (optional)">
          <input
            value={deposit}
            onChange={(event) =>
              setDeposit(event.target.value.replace(/[^\d.]/g, ""))
            }
            inputMode="decimal"
            placeholder="Enter amount e.g $1000"
            className={SAVINGS_INPUT}
          />
        </SavingsField>

        <div className="flex flex-col gap-2">
          <div className="h-1 w-full overflow-hidden bg-jumpa-primary-200">
            <div className="h-full w-1/4 bg-jumpa-primary-400" />
          </div>
          <p className="text-[10px] leading-3.5 font-medium text-jumpa-black">
            Target - <span className="font-bold">{total}</span>
          </p>
        </div>

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
          onRetry={() => setPinError(false)}
          onClose={() => setSheet("review")}
          onComplete={(pin) => {
            if (pin === DEMO_PIN) setStage("done");
            else setPinError(true);
          }}
        />
      ) : null}
    </>
  );
}

/** Bordered date field, matching the savings form shell. */
function DateInput({
  label,
  value,
  invalid,
  onChange,
}: {
  label: string;
  value: string;
  invalid: boolean;
  onChange: (next: string) => void;
}) {
  return (
    <input
      type="date"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      aria-label={label}
      aria-invalid={invalid}
      className={`h-11.5 w-full rounded-surface border bg-jumpa-white px-3 text-xs leading-4 font-medium text-jumpa-primary-950 outline-none ${
        invalid ? "border-jumpa-danger" : "border-jumpa-grey-100"
      }`}
    />
  );
}
