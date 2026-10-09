import { type ReactNode, useRef, useState } from "react";
import { InfoNote } from "@/components/auth/info-note";
import { ChoiceChips } from "@/components/savings/choice-chips";
import {
  SAVINGS_INPUT,
  SavingsField,
  SavingsLabel,
  savingsShell,
} from "@/components/savings/savings-field";
import {
  SavingsForm,
  SavingsPanel,
  SavingsRule,
} from "@/components/savings/savings-form";
import { MinusIcon } from "@/components/ui/icons/minus";
import { PlusIcon } from "@/components/ui/icons/plus";
import { SegmentedToggle } from "@/components/ui/segmented-toggle";
import {
  addDays,
  apyForDays,
  formatApy,
  LOCK_TERMS,
  longDate,
  projectedYield,
  rateForTerm,
  type SavingsKind,
  type SavingsTerm,
  shortDate,
  TARGET_TERMS,
} from "@/lib/savings";
import {
  createGoal,
  formatMoney,
  HUB_CURRENCIES,
  type HubCurrency,
  type HubGoal,
} from "@/lib/savings-hub";
import { type FormErrors, revealFirstError } from "@/lib/validation";
import { MoneyField } from "./money-field";

/** A lock and a circle need an end date; the custom range is the production form's. */
const FIXED_TERMS = LOCK_TERMS.filter((term) => !term.custom);

type FormConfig = {
  title: string;
  cta: string;
  nameLabel: string;
  namePlaceholder: string;
  /** `null` when the plan has no target of its own — a lock's is what it locks. */
  targetLabel: string | null;
  depositLabel: string;
  depositEmpty: string;
  termLabel: string;
  terms: SavingsTerm[];
};

/** Everything that differs between the three create forms. */
const FORMS: Record<SavingsKind, FormConfig> = {
  individual: {
    title: "New goal",
    cta: "Create goal",
    nameLabel: "Goal name",
    namePlaceholder: "Rainy day fund",
    targetLabel: "Target amount",
    depositLabel: "First deposit",
    depositEmpty: "Enter how much to start with",
    termLabel: "Save for",
    terms: TARGET_TERMS,
  },
  lock: {
    title: "Lock savings",
    cta: "Lock funds",
    nameLabel: "Name this lock",
    namePlaceholder: "Rent reserve",
    targetLabel: null,
    depositLabel: "Amount to lock",
    depositEmpty: "Enter the amount you want to lock",
    termLabel: "Lock for",
    terms: FIXED_TERMS,
  },
  circle: {
    title: "New circle",
    cta: "Create circle",
    nameLabel: "Circle name",
    namePlaceholder: "December trip",
    targetLabel: "Group target",
    depositLabel: "Your first contribution",
    depositEmpty: "Enter how much to start with",
    termLabel: "Save for",
    terms: FIXED_TERMS,
  },
};

const MEMBERS = { min: 2, max: 50, start: 4 } as const;

type Field = "name" | "target" | "deposit";

/** One form for all three products; `FORMS` holds what differs. */
export function CreateGoalForm({
  kind,
  currency: initialCurrency,
  onBack,
  onCreate,
}: {
  kind: SavingsKind;
  currency: HubCurrency;
  onBack: () => void;
  onCreate: (goal: HubGoal) => void;
}) {
  const form = FORMS[kind];
  const fields = useRef<HTMLDivElement>(null);
  const [currency, setCurrency] = useState(initialCurrency);
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [deposit, setDeposit] = useState("");
  const [term, setTerm] = useState(form.terms[form.terms.length - 1].label);
  const [members, setMembers] = useState<number>(MEMBERS.start);
  const [errors, setErrors] = useState<FormErrors<Field>>({});

  const days = form.terms.find((option) => option.label === term)?.days ?? null;
  const apy = apyForDays(kind, days);
  const principal = Number(deposit) || 0;
  const earned = projectedYield(principal, apy, days ?? 365);
  const end = days === null ? null : addDays(days);

  const clear = (field: Field) =>
    setErrors((current) => ({ ...current, [field]: undefined }));

  const submit = () => {
    const goal = Number(target) || 0;
    const next: FormErrors<Field> = {};
    if (!name.trim()) next.name = "Give this plan a name";
    if (form.targetLabel && goal <= 0) next.target = "Enter your target amount";
    if (principal <= 0) next.deposit = form.depositEmpty;
    else if (form.targetLabel && goal > 0 && principal > goal) {
      next.deposit = "This is more than the target";
    }

    setErrors(next);
    if (Object.keys(next).length > 0) {
      revealFirstError(fields.current);
      return;
    }

    onCreate(
      createGoal({
        kind,
        currency,
        name: name.trim(),
        deposit: principal,
        target: form.targetLabel ? goal : principal,
        termDays: days,
        members: kind === "circle" ? members : undefined,
      }),
    );
  };

  return (
    <SavingsForm
      back="/home"
      onBack={onBack}
      title={form.title}
      cta={form.cta}
      ctaVariant="gradientSheet"
      fields={fields}
      onSubmit={submit}
    >
      <div className="flex flex-col gap-3">
        <SavingsLabel>Currency</SavingsLabel>
        <SegmentedToggle
          variant="split"
          slide
          options={HUB_CURRENCIES}
          value={currency}
          onChange={setCurrency}
        />
      </div>

      <SavingsField label={form.nameLabel} error={errors.name}>
        <input
          value={name}
          maxLength={40}
          autoComplete="off"
          onChange={(event) => {
            setName(event.target.value);
            clear("name");
          }}
          placeholder={form.namePlaceholder}
          aria-invalid={errors.name ? true : undefined}
          className={SAVINGS_INPUT}
        />
      </SavingsField>

      {form.targetLabel ? (
        <MoneyField
          label={form.targetLabel}
          currency={currency}
          value={target}
          onChange={(next) => {
            setTarget(next);
            clear("target");
          }}
          error={errors.target}
          example="target"
        />
      ) : null}

      <MoneyField
        label={form.depositLabel}
        currency={currency}
        value={deposit}
        onChange={(next) => {
          setDeposit(next);
          clear("deposit");
        }}
        error={errors.deposit}
      />

      {kind === "circle" ? (
        <MemberStepper value={members} onChange={setMembers} />
      ) : null}

      <SavingsPanel>
        <span className="px-2.5">
          <SavingsLabel>{form.termLabel}</SavingsLabel>
        </span>
        <ChoiceChips
          options={form.terms.map((option) => option.label)}
          value={term}
          onChange={setTerm}
          caption={(label) => rateForTerm(kind, form.terms, label)}
        />

        <SavingsRule />

        {/* The rate leads — it is the reason to pick a longer term. */}
        <div className="flex items-end justify-between gap-3 px-2.5">
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="text-[10px] leading-3 font-medium text-jumpa-neutral-500">
              You earn
            </span>
            <span className="text-sm leading-4 font-semibold text-jumpa-primary-600">
              {formatApy(apy)} a year
            </span>
            <span className="text-[11px] leading-4 text-jumpa-neutral-600">
              {principal > 0
                ? `+${formatMoney(earned, currency)} ${days === null ? "a year" : `over ${days} days`}`
                : "Enter an amount to see your return"}
            </span>
          </span>
          <span className="shrink-0 text-xs leading-4 font-medium text-jumpa-black">
            {end
              ? `${kind === "lock" ? "Unlocks" : "Ends"} ${shortDate(end)}`
              : "No deadline"}
          </span>
        </div>
      </SavingsPanel>

      {kind === "lock" && end ? (
        <InfoNote tone="warning">
          Your money stays locked until {longDate(end)}.
        </InfoNote>
      ) : null}

      {kind === "circle" ? (
        <InfoNote tone="brand">
          You&apos;ll get an invite link to share once the circle is created.
        </InfoNote>
      ) : null}
    </SavingsForm>
  );
}

/** Head count for a circle, two to fifty. */
function MemberStepper({
  value,
  onChange,
}: {
  value: number;
  onChange: (next: number) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <SavingsLabel>Members</SavingsLabel>
      <div className={`${savingsShell()} justify-between`}>
        <span
          aria-live="polite"
          className="text-xs leading-4 font-medium text-jumpa-primary-950"
        >
          {value} people, including you
        </span>
        <span className="flex items-center gap-1.5">
          <StepButton
            label="Fewer members"
            disabled={value <= MEMBERS.min}
            onClick={() => onChange(value - 1)}
          >
            <MinusIcon className="size-4" />
          </StepButton>
          <StepButton
            label="More members"
            disabled={value >= MEMBERS.max}
            onClick={() => onChange(value + 1)}
          >
            <PlusIcon className="size-4" />
          </StepButton>
        </span>
      </div>
    </div>
  );
}

function StepButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="tap flex size-9 items-center justify-center rounded-full bg-jumpa-primary-50 text-jumpa-primary-600 active:scale-95 disabled:opacity-40"
    >
      {children}
    </button>
  );
}
