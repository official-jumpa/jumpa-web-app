"use client";

import Image from "next/image";
import { type ReactNode, useRef, useState, useEffect } from "react";
import { InfoNote } from "@/components/auth/info-note";
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
import { ChevronDownIcon } from "@/components/ui/icons/chevron-down";
import { MinusIcon } from "@/components/ui/icons/minus";
import { NairaSignIcon } from "@/components/ui/icons/naira-sign";
import { PlusIcon } from "@/components/ui/icons/plus";
import {
  addDays,
  apyForDays,
  longDate,
  projectedYield,
  type SavingsKind,
  shortDate,
} from "@/lib/savings";
import {
  type CircleStyleKey,
  createGoal,
  formatMoney,
  type HubCurrency,
  type HubGoal,
} from "@/lib/savings-hub";
import { type FormErrors, revealFirstError } from "@/lib/validation";
import { CircleStylePicker } from "./circle-style-picker";
import { MoneyField } from "./money-field";
import { TermPicker } from "./term-picker";

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
  /** A flexible goal may run with no end date. */
  openEnded: boolean;
};

/** Everything that differs between the three create forms. */
const FORMS: Record<SavingsKind, FormConfig> = {
  individual: {
    title: "New goal",
    cta: "Create goal",
    nameLabel: "Goal name",
    namePlaceholder: "Rainy day fund",
    targetLabel: "Target amount",
    depositLabel: "First deposit (optional)",
    depositEmpty: "Enter how much to start with",
    termLabel: "Target timeline",
    openEnded: true,
  },
  lock: {
    title: "Lock savings",
    cta: "Lock funds",
    nameLabel: "Goal name",
    namePlaceholder: "Rent reserve",
    targetLabel: null,
    depositLabel: "Amount to lock",
    depositEmpty: "Enter the amount you want to lock",
    termLabel: "Lock duration",
    openEnded: false,
  },
  circle: {
    title: "New circle",
    cta: "Create circle",
    nameLabel: "Circle name",
    namePlaceholder: "December trip",
    targetLabel: "Group target",
    depositLabel: "Your first contribution",
    depositEmpty: "Enter how much to start with",
    termLabel: "Circle duration",
    openEnded: false,
  },
};

const MEMBERS = { min: 2, max: 50, start: 4 } as const;

type Field = "name" | "target" | "deposit";

/** Inline currency switcher dropdown on the right of the amount field. */
function CurrencyPickerDropdown({
  value,
  onChange,
}: {
  value: HubCurrency;
  onChange: (next: HubCurrency) => void;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-full border border-jumpa-grey-100 bg-jumpa-neutral-50 px-2.5 py-1 text-xs font-semibold text-jumpa-black transition-colors hover:bg-jumpa-neutral-100 active:scale-95"
      >
        {value === "NGN" ? (
          <span className="flex size-4 items-center justify-center rounded-full bg-emerald-600 text-jumpa-white">
            <NairaSignIcon className="size-2.5" />
          </span>
        ) : (
          <Image
            src="/coins/usdc.webp"
            alt="USDC"
            width={16}
            height={16}
            className="size-4 rounded-full"
          />
        )}
        <span>{value}</span>
        <ChevronDownIcon
          className={`size-3 text-jumpa-neutral-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open ? (
        <div className="absolute right-0 top-full z-50 mt-1 flex min-w-28 flex-col overflow-hidden rounded-xl border border-jumpa-grey-100 bg-jumpa-white p-1 shadow-lg animate-drop-in">
          <button
            type="button"
            onClick={() => {
              onChange("NGN");
              setOpen(false);
            }}
            className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium transition-colors ${value === "NGN"
                ? "bg-jumpa-primary-50 text-jumpa-primary-600"
                : "text-jumpa-black hover:bg-jumpa-neutral-50"
              }`}
          >
            <span className="flex size-4 items-center justify-center rounded-full bg-emerald-600 text-jumpa-white">
              <NairaSignIcon className="size-2.5" />
            </span>
            <span>Naira</span>
          </button>
          <button
            type="button"
            onClick={() => {
              onChange("USDC");
              setOpen(false);
            }}
            className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium transition-colors ${value === "USDC"
                ? "bg-jumpa-primary-50 text-jumpa-primary-600"
                : "text-jumpa-black hover:bg-jumpa-neutral-50"
              }`}
          >
            <Image
              src="/coins/usdc.webp"
              alt="USDC"
              width={16}
              height={16}
              className="size-4 rounded-full"
            />
            <span>USDC</span>
          </button>
        </div>
      ) : null}
    </div>
  );
}

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
  // Individual savings defaults to open-ended (null days), Lock & Circle default to 1 Month (30 days)
  const [selectedDays, setSelectedDays] = useState<number | null>(
    form.openEnded ? null : 30,
  );
  const [circleStyle, setCircleStyle] =
    useState<CircleStyleKey>("save_together");
  const [members, setMembers] = useState<number>(MEMBERS.start);
  const [errors, setErrors] = useState<FormErrors<Field>>({});

  const days = selectedDays;
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
    // Individual savings can have optional first deposit (principal >= 0)
    if (kind !== "individual" && principal <= 0) {
      next.deposit = form.depositEmpty;
    } else if (form.targetLabel && goal > 0 && principal > goal) {
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
        circleStyle: kind === "circle" ? circleStyle : undefined,
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


      {kind === "circle" ? (
        <div className="flex flex-col gap-3">
          <SavingsLabel>Circle type</SavingsLabel>
          <CircleStylePicker value={circleStyle} onChange={setCircleStyle} />
        </div>
      ) : null}

      {/* 2. Target Amount (or Initial Deposit for locks) with inline currency dropdown */}
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
          trailing={
            <CurrencyPickerDropdown value={currency} onChange={setCurrency} />
          }
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
        trailing={
          !form.targetLabel ? (
            <CurrencyPickerDropdown value={currency} onChange={setCurrency} />
          ) : undefined
        }
      />

      {kind === "circle" ? (
        <MemberStepper value={members} onChange={setMembers} />
      ) : null}

      <SavingsPanel>
        <div className="px-2.5">
          <SavingsLabel>{form.termLabel}</SavingsLabel>
          <div className="mt-2">
            <TermPicker
              kind={kind}
              label={form.termLabel}
              value={selectedDays}
              onChange={setSelectedDays}
              openEnded={form.openEnded}
            />
          </div>
        </div>

        <SavingsRule />

        {/* The rate leads — it is the reason to pick a longer term. */}
        <div className="flex items-end justify-between gap-3 px-2.5">
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="text-[11px] leading-4 text-jumpa-neutral-600">
              {principal > 0
                ? `You earn +${formatMoney(earned, currency)} ${days === null ? "a year" : `over ${days} days`}`
                : "Enter an amount to see your return"}
            </span>
          </span>
          <span className="shrink-0 text-xs leading-4 font-medium text-jumpa-black">
            {end
              ? `${kind === "lock" ? "Unlocks" : "until"} ${shortDate(end)}`
              : "No deadline"}
          </span>
        </div>
      </SavingsPanel>

      {kind === "lock" && end ? (
        <InfoNote>
          Funds will be locked until {longDate(end)}. You can withdraw early at any
          time by forfeiting accrued interest, with 100% of your principal returned.
        </InfoNote>
      ) : null}
    </SavingsForm>
  );
}

/** Stepper for head count on a circle. */
function MemberStepper({
  value,
  onChange,
}: {
  value: number;
  onChange: (next: number) => void;
}) {
  const step = (delta: number) => () =>
    onChange(Math.max(MEMBERS.min, Math.min(MEMBERS.max, value + delta)));

  return (
    <SavingsField label="Members in circle">
      <div className="flex w-full items-center justify-between">
        <span className="text-sm leading-4 font-medium text-jumpa-black">
          {value} {value === 1 ? "member" : "members"}
        </span>
        <span className="flex items-center gap-1.5">
          <StepButton
            disabled={value <= MEMBERS.min}
            onClick={step(-1)}
            aria-label="Fewer members"
          >
            <MinusIcon className="size-3.5" />
          </StepButton>
          <StepButton
            disabled={value >= MEMBERS.max}
            onClick={step(1)}
            aria-label="More members"
          >
            <PlusIcon className="size-3.5" />
          </StepButton>
        </span>
      </div>
    </SavingsField>
  );
}

function StepButton({
  disabled,
  onClick,
  children,
  "aria-label": label,
}: {
  disabled: boolean;
  onClick: () => void;
  children: ReactNode;
  "aria-label": string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-label={label}
      className="tap flex size-7 items-center justify-center rounded-full border border-jumpa-grey-100 bg-jumpa-neutral-50 text-jumpa-black transition-opacity disabled:opacity-35"
    >
      {children}
    </button>
  );
}
