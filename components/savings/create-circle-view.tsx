"use client";

import { useRef, useState } from "react";
import { CopyButton } from "@/components/auth/copy-button";
import { ChoiceChips } from "@/components/savings/choice-chips";
import {
  SAVINGS_INPUT,
  SavingsField,
  SavingsLabel,
} from "@/components/savings/savings-field";
import { SavingsForm, SavingsPanel } from "@/components/savings/savings-form";
import { DetailList, DetailRow } from "@/components/transfer/detail-list";
import { TransferSuccess } from "@/components/transfer/transfer-success";
import { DateField } from "@/components/ui/date-field";
import { FieldError } from "@/components/ui/field-error";
import { UsersIcon } from "@/components/ui/icons/users";
import {
  addDays,
  CIRCLE_INVITE,
  displayDate,
  SAVINGS_CATEGORIES,
} from "@/lib/savings";
import { formatAmount } from "@/lib/transfer";
import { revealFirstError } from "@/lib/validation";
import type { Promotion } from "@/lib/wallet";

type Errors = { name?: string; target?: string; date?: string };

/** Open a savings circle: name it, set the target and the date, then invite. */
export function CreateCircleView({ promotions }: { promotions: Promotion[] }) {
  const fields = useRef<HTMLDivElement>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState(SAVINGS_CATEGORIES[0]);
  const [target, setTarget] = useState("");
  const [date, setDate] = useState(addDays(60));
  const [errors, setErrors] = useState<Errors>({});
  const [done, setDone] = useState(false);

  const total = `₦${formatAmount(target)}`;

  const clear = (field: keyof Errors) =>
    setErrors((current) => ({ ...current, [field]: undefined }));

  const submit = () => {
    const next: Errors = {};
    if (!name.trim()) next.name = "Give your circle a name";
    if (!Number(target)) next.target = "Set the amount the circle is saving to";
    if (!date) next.date = "Pick the date the circle should reach its target";

    setErrors(next);
    if (Object.values(next).some(Boolean)) {
      revealFirstError(fields.current);
      return;
    }
    setDone(true);
  };

  if (done) {
    return (
      <TransferSuccess
        back="/savings/circles"
        title="Your Circle is ready"
        titleFirst
        actionsFirst
        amount={total}
        promotions={promotions}
        ctaLabel="View circle"
        ctaHref="/savings/circles"
        actions={
          <div className="flex flex-col gap-3">
            <DetailList tone="secondary">
              <DetailRow label="Circle" value={name} />
              <DetailRow label="Category" value={category} />
              <DetailRow
                label="Target date"
                value={displayDate(date)}
                rule={false}
              />
            </DetailList>

            <div className="flex items-center gap-3 rounded-surface bg-jumpa-primary-50 px-3 py-3.5">
              <UsersIcon className="size-5 shrink-0 text-jumpa-primary-600" />
              <span className="min-w-0 flex-1 truncate text-xs leading-4 font-medium text-jumpa-primary-950">
                {CIRCLE_INVITE}
              </span>
              <CopyButton value={CIRCLE_INVITE} label="Invite link" />
            </div>
          </div>
        }
      />
    );
  }

  return (
    <SavingsForm
      back="/savings/circles"
      title="Create circle"
      cta="Continue"
      fields={fields}
      onSubmit={submit}
    >
      <SavingsField label="Name your circle" error={errors.name}>
        <input
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            clear("name");
          }}
          placeholder="What is this circle for?"
          aria-invalid={Boolean(errors.name)}
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

      <SavingsField label="Set your target" error={errors.target}>
        <input
          value={target}
          onChange={(event) => {
            setTarget(event.target.value.replace(/[^\d.]/g, ""));
            clear("target");
          }}
          inputMode="decimal"
          placeholder="Enter amount e.g ₦500,000"
          aria-invalid={Boolean(errors.target)}
          className={SAVINGS_INPUT}
        />
      </SavingsField>

      <SavingsPanel>
        <div className="flex flex-col gap-3">
          <SavingsLabel>Target date</SavingsLabel>
          <DateField
            label="Target date"
            value={date}
            invalid={Boolean(errors.date)}
            onChange={(next) => {
              setDate(next);
              clear("date");
            }}
          />
          <FieldError>{errors.date}</FieldError>
        </div>
      </SavingsPanel>
    </SavingsForm>
  );
}
