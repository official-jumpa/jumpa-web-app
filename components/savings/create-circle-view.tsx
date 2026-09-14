"use client";

import { useRef, useState } from "react";
import { CategoryChips } from "@/components/savings/category-chips";
import { PlanAction, PlanActions } from "@/components/savings/plan-actions";
import {
  SAVINGS_INPUT,
  SavingsField,
  SavingsLabel,
  savingsShell,
} from "@/components/savings/savings-field";
import { SavingsForm, SavingsPanel } from "@/components/savings/savings-form";
import { TransferSuccess } from "@/components/transfer/transfer-success";
import { DateField } from "@/components/ui/date-field";
import { FieldError } from "@/components/ui/field-error";
import { ShieldCheckIcon } from "@/components/ui/icons/shield-check";
import { addDays, SAVINGS_CATEGORIES } from "@/lib/savings";
import { revealFirstError } from "@/lib/validation";

type Errors = { name?: string; target?: string; date?: string };

/** Open a savings circle: name it, set the target and the date, then invite. */
export function CreateCircleView() {
  const fields = useRef<HTMLDivElement>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState(SAVINGS_CATEGORIES[0]);
  const [customCategory, setCustomCategory] = useState("");
  const [target, setTarget] = useState("");
  const [date, setDate] = useState(addDays(60));
  const [errors, setErrors] = useState<Errors>({});
  const [done, setDone] = useState(false);

  const clear = (field: keyof Errors) =>
    setErrors((current) => ({ ...current, [field]: undefined }));

  const submit = () => {
    const next: Errors = {};
    const today = addDays(0);
    if (!name.trim()) next.name = "Give your circle a name";
    if (!Number(target)) next.target = "Set the amount the circle is saving to";
    if (!date) next.date = "Pick the date the circle should reach its target";
    else if (date < today) next.date = "The target date cannot be in the past";

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
        compact
        back="/savings/circles"
        title="Successful"
        titleFirst
        amount="Your Circle is ready"
        note={`${name} has been created.`}
        // Neither destination is designed yet; both land on the circles list.
        actions={
          <PlanActions>
            <PlanAction href="/savings/circles" icon={ShieldCheckIcon}>
              Invite members
            </PlanAction>
            <PlanAction href="/savings/circles" icon={ShieldCheckIcon}>
              View circle
            </PlanAction>
          </PlanActions>
        }
        ctaLabel="Back to home"
        ctaHref="/home"
      />
    );
  }

  return (
    <SavingsForm
      back="/savings/circles"
      title="Create circle"
      cta="Continue"
      ctaVariant="gradientSheet"
      fields={fields}
      onSubmit={submit}
    >
      {/* The category chips sit inside the name group, with no label of their own. */}
      <div className="flex flex-col gap-3">
        <SavingsLabel>Name your circle</SavingsLabel>
        <label className={savingsShell(Boolean(errors.name))}>
          <input
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              clear("name");
            }}
            placeholder="December Hangout"
            aria-invalid={Boolean(errors.name)}
            className={SAVINGS_INPUT}
          />
        </label>
        <CategoryChips
          value={category}
          custom={customCategory}
          onChange={setCategory}
          onCustomChange={setCustomCategory}
        />
        <FieldError>{errors.name}</FieldError>
      </div>

      <SavingsField label="Set your target" error={errors.target}>
        <input
          value={target}
          onChange={(event) => {
            setTarget(event.target.value.replace(/[^\d.]/g, ""));
            clear("target");
          }}
          inputMode="decimal"
          placeholder="₦500,000"
          aria-invalid={Boolean(errors.target)}
          className={SAVINGS_INPUT}
        />
      </SavingsField>

      <SavingsPanel>
        <div className="flex flex-col gap-3">
          <SavingsLabel>Target date</SavingsLabel>
          <DateField
            label="Target date"
            icon="globe"
            value={date}
            min={addDays(0)}
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
