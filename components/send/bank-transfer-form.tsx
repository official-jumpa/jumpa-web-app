"use client";

import { useEffect, useRef, useState } from "react";
import {
  FIELD_INPUT,
  Field,
  FieldLabel,
  PasteAction,
  SelectField,
} from "@/components/transfer/field";
import { OptionRow } from "@/components/transfer/option-row";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { FieldError } from "@/components/ui/field-error";
import { CircleInformationIcon } from "@/components/ui/icons/circle-information";
import { GlobeIcon } from "@/components/ui/icons/globe";
import { ShieldCheckIcon } from "@/components/ui/icons/shield-check";
import { SegmentedToggle } from "@/components/ui/segmented-toggle";
import { getAssetLogo } from "@/lib/assets";
import { MOBILE_NETWORKS, PHONE_NUMBER_MIN } from "@/lib/bills";
import { supportedBanks } from "@/lib/constants/banks";
import {
  ACCOUNT_NUMBER_MIN,
  BANKS,
  COUNTRIES,
  type Country,
  ROUTING_NUMBER_LENGTH,
  resolveAccountName,
} from "@/lib/transfer";
import {
  checkLength,
  digitsOf,
  type FormErrors,
  revealFirstError,
} from "@/lib/validation";

/** Both rails share one form; `destination` decides which fields are asked for. */
export type Destination = "bank" | "momo";

export type BankForm = {
  destination: Destination;
  country: string;
  account: string;
  bank: string;
  routing: string;
  name: string;
  note: string;
  network: string;
  asset: string;
  phone: string;
};

export interface BankAccountItem {
  id: string;
  name: string;
  bank: string;
  number: string;
  country?: string;
}

export const OFFRAMP_NETWORKS = ["Base", "Solana", "Ethereum"] as const;

export const OFFRAMP_NETWORK_CONFIGS: Record<
  string,
  { name: string; chain: "base" | "solana" | "eth"; assets: readonly string[] }
> = {
  Base: {
    name: "Base",
    chain: "base",
    assets: ["USDC"],
  },
  Solana: {
    name: "Solana",
    chain: "solana",
    assets: ["USDC", "USDT"],
  },
  Ethereum: {
    name: "Ethereum",
    chain: "eth",
    assets: ["USDC", "USDT"],
  },
};

export const OFFRAMP_NETWORK_OPTIONS = OFFRAMP_NETWORKS.map((net) => ({
  value: net,
  label: net,
  icon: getAssetLogo(net),
}));

export const EMPTY_BANK_FORM: BankForm = {
  destination: "bank",
  country: "",
  account: "",
  bank: "",
  routing: "",
  name: "",
  note: "",
  network: "Base",
  asset: "USDC",
  phone: "",
};

// Mobile money is off at the client's ask — drop `disabled` to bring it back.
const DESTINATIONS = [
  { value: "bank" as const, label: "To bank" },
  { value: "momo" as const, label: "Mobile money", disabled: true },
];

/** Only Nigeria is live at the client's ask; the rest are listed but inert. */
const LIVE_COUNTRY = "NG";

const COUNTRY_OPTIONS = COUNTRIES.map((entry) => {
  const live = entry.code === LIVE_COUNTRY;
  return {
    value: entry.label,
    label: `${entry.label} - ${entry.currency}`,
    caption: live ? undefined : "Coming soon",
    disabled: !live,
  };
});

const NETWORK_OPTIONS = MOBILE_NETWORKS.map((network) => ({
  value: `Momo - ${network.label}`,
  label: `Momo - ${network.label}`,
  icon: network.logo,
}));

const NIGERIA_BANK_OPTIONS = supportedBanks.map((b) => b.name);

type BankField = keyof BankForm;

/** What has to be filled in before the amount screen, per rail. */
function validate(
  form: BankForm,
  country: Country | undefined,
): FormErrors<BankField> {
  const errors: FormErrors<BankField> = {};
  if (!form.country) errors.country = "Choose the country you are sending to.";

  if (form.destination === "momo") {
    if (!form.network) errors.network = "Choose the mobile money network.";
    errors.phone = checkLength(
      form.phone,
      PHONE_NUMBER_MIN,
      "Phone numbers",
      "Enter the recipient's phone number.",
    );
  } else {
    errors.account = checkLength(
      form.account,
      ACCOUNT_NUMBER_MIN,
      "Account numbers",
      "Enter the recipient's account number.",
    );
    if (!form.bank) errors.bank = "Choose the recipient's bank.";
    if (country?.routing) {
      errors.routing = checkLength(
        form.routing,
        ROUTING_NUMBER_LENGTH,
        "Routing numbers",
        "Enter the bank's routing number.",
      );
    }
    if (country && !form.name.trim()) {
      errors.name = "Enter the account name.";
    }
  }

  for (const key of Object.keys(errors) as BankField[]) {
    if (!errors[key]) delete errors[key];
  }
  return errors;
}

/** Recipient details. Recents are offered until a country picks the rails. */
export function BankTransferForm({
  form,
  defaultCountry,
  onChange,
  onPickRecent,
  onContinue,
}: {
  form: BankForm;
  defaultCountry?: string;
  onChange: (next: BankForm) => void;
  onPickRecent: (account: BankAccountItem) => void;
  onContinue: () => void;
}) {
  const [recentAccounts, setRecentAccounts] = useState<BankAccountItem[]>([]);
  const [resolving, setResolving] = useState(false);
  const [errors, setErrors] = useState<FormErrors<BankField>>({});
  const fields = useRef<HTMLDivElement>(null);

  // Initialize country from defaultCountry if not yet set
  useEffect(() => {
    if (!form.country && defaultCountry) {
      const match =
        COUNTRIES.find(
          (c) =>
            c.label.toLowerCase() === defaultCountry.toLowerCase() ||
            c.code.toLowerCase() === defaultCountry.toLowerCase(),
        )?.label || defaultCountry;
      onChange({ ...form, country: match });
    }
  }, [defaultCountry, form, onChange]);

  // Load saved beneficiaries for bank transfers
  useEffect(() => {
    let live = true;
    async function loadBeneficiaries() {
      try {
        const res = await fetch("/api/beneficiaries?type=bank");
        if (!res.ok) return;
        const data = await res.json();
        if (live && Array.isArray(data.beneficiaries)) {
          const mapped: BankAccountItem[] = data.beneficiaries.map(
            (b: any) => ({
              id: b._id,
              name: b.name,
              bank: b.details?.bankName || "",
              number: b.details?.accountNumber || "",
              country: b.details?.country || "Nigeria",
            }),
          );
          setRecentAccounts(mapped);
        }
      } catch {
        // keep fallback
      }
    }
    loadBeneficiaries();
    return () => {
      live = false;
    };
  }, []);

  const country = COUNTRIES.find((entry) => entry.label === form.country);
  const momo = form.destination === "momo";

  // Editing a field clears its message; the rest stay until the next attempt.
  const set = (patch: Partial<BankForm>) => {
    setErrors((current) => {
      const next = { ...current };
      for (const key of Object.keys(patch) as BankField[]) delete next[key];
      return next;
    });
    onChange({ ...form, ...patch });
  };

  const submit = () => {
    const found = validate(form, country);
    setErrors(found);
    if (Object.keys(found).length === 0) onContinue();
    else revealFirstError(fields.current);
  };

  // Whichever pair identifies the recipient on the rail in play.
  const holder = momo ? form.network : form.bank;
  const reference = momo ? form.phone : form.account;
  const minimum = momo ? PHONE_NUMBER_MIN : ACCOUNT_NUMBER_MIN;

  const latest = useRef(form);
  latest.current = form;

  // Real live account name resolution via /api/bank/resolve
  useEffect(() => {
    const cleanRef = digitsOf(reference);
    if (cleanRef.length < minimum || !holder) return;

    let live = true;

    async function runResolve() {
      setResolving(true);
      try {
        if (!momo) {
          const res = await fetch(
            `/api/bank/resolve?accountNumber=${cleanRef}&bank=${encodeURIComponent(holder)}`,
          );
          const data = await res.json();
          if (live) {
            if (res.ok && data.success && data.accountName) {
              onChange({ ...latest.current, name: data.accountName });
              setErrors((prev) => {
                const next = { ...prev };
                delete next.name;
                delete next.account;
                return next;
              });
            } else {
              setErrors((prev) => ({
                ...prev,
                name: data.error || "Could not verify account name",
              }));
            }
          }
        } else {
          // Mobile money fallback
          const name = await resolveAccountName(holder, reference);
          if (live) onChange({ ...latest.current, name });
        }
      } catch {
        if (live) {
          setErrors((prev) => ({
            ...prev,
            name: "Failed to connect to verification service",
          }));
        }
      } finally {
        if (live) setResolving(false);
      }
    }

    runResolve();

    return () => {
      live = false;
    };
  }, [holder, reference, minimum, momo, onChange]);

  const isNigeria =
    country?.code === "NG" || form.country.toLowerCase().includes("nigeria");
  const bankOptions = isNigeria
    ? NIGERIA_BANK_OPTIONS
    : BANKS[country?.code ?? ""] ?? [];

  const currentNetworkConfig =
    OFFRAMP_NETWORK_CONFIGS[form.network || "Base"] ||
    OFFRAMP_NETWORK_CONFIGS.Base;
  const assetOptions = currentNetworkConfig.assets.map((symbol) => ({
    value: symbol,
    label: symbol,
    icon: getAssetLogo(symbol),
  }));

  return (
    <div ref={fields} className="flex flex-1 flex-col gap-5 pt-6">
      <SelectField
        label="Select country"
        icon={<GlobeIcon aria-hidden="true" className="size-6 shrink-0" />}
        value={form.country}
        placeholder="Select Country"
        options={COUNTRY_OPTIONS}
        error={errors.country}
        onChange={(next) => set({ country: next })}
      />

      <SegmentedToggle
        variant="split"
        options={DESTINATIONS}
        value={form.destination}
        onChange={(destination) => set({ destination })}
      />

      {/* Show recent beneficiaries when account number field is empty */}
      {!form.account && recentAccounts.length > 0 && !momo && (
        <section className="flex flex-col gap-3">
          <h2 className="text-xs leading-5 font-medium text-jumpa-black">
            Recent accounts
          </h2>
          <ul className="flex flex-col gap-4 rounded-surface bg-jumpa-primary-50 px-4 py-4">
            {recentAccounts.slice(0, 4).map((entry) => (
              <li key={entry.id}>
                <OptionRow
                  Icon={CircleInformationIcon}
                  title={entry.name}
                  caption={`${entry.bank} - ${entry.number}`}
                  onClick={() => onPickRecent(entry)}
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      {momo ? (
        <>
          <SelectField
            label="Mobile network"
            icon={<GlobeIcon aria-hidden="true" className="size-6 shrink-0" />}
            value={form.network}
            placeholder="Select network"
            options={NETWORK_OPTIONS}
            error={errors.network}
            onChange={(next) => set({ network: next })}
          />

          <Field label="Phone number" error={errors.phone}>
            <input
              value={form.phone}
              onChange={(event) => set({ phone: event.target.value })}
              inputMode="tel"
              placeholder="234XXX9320"
              aria-invalid={Boolean(errors.phone)}
              className={FIELD_INPUT}
            />
            <PasteAction onPaste={(text) => set({ phone: text.trim() })} />
          </Field>
        </>
      ) : (
        <>
          <Field label="Account number" error={errors.account}>
            <input
              value={form.account}
              onChange={(event) => set({ account: event.target.value })}
              inputMode="numeric"
              placeholder="234XXX9320"
              aria-invalid={Boolean(errors.account)}
              className={FIELD_INPUT}
            />
            <PasteAction onPaste={(text) => set({ account: text.trim() })} />
          </Field>

          <div className="flex flex-col gap-2">
            <FieldLabel>Search bank</FieldLabel>
            <Combobox
              label="Search bank"
              value={form.bank}
              options={bankOptions}
              placeholder="Search bank"
              invalid={Boolean(errors.bank)}
              onValueChange={(next) => set({ bank: next })}
            />
            <FieldError>{errors.bank}</FieldError>
          </div>

          {country?.routing ? (
            <Field label="Routing number" error={errors.routing}>
              <input
                value={form.routing}
                onChange={(event) => set({ routing: event.target.value })}
                inputMode="numeric"
                placeholder="021000021"
                aria-invalid={Boolean(errors.routing)}
                className={FIELD_INPUT}
              />
            </Field>
          ) : null}

          {/* Network and Asset Selectors */}
          <SelectField
            label="Network"
            icon={<GlobeIcon aria-hidden="true" className="size-6 shrink-0" />}
            value={form.network || "Base"}
            options={OFFRAMP_NETWORK_OPTIONS}
            onChange={(network) => {
              const defaultAsset =
                OFFRAMP_NETWORK_CONFIGS[network]?.assets[0] || "USDC";
              set({ network, asset: defaultAsset });
            }}
          />

          <SelectField
            label="Asset to send"
            value={form.asset || "USDC"}
            options={assetOptions}
            onChange={(asset) => set({ asset })}
          />

          {country ? (
            <>
              {/* Read-Only Account Name */}
              <Field label="Account name" error={errors.name}>
                <input
                  value={form.name}
                  readOnly
                  disabled
                  placeholder={
                    resolving
                      ? "Verifying account…"
                      : "Account name (auto-verified)"
                  }
                  aria-invalid={Boolean(errors.name)}
                  className={`${FIELD_INPUT} cursor-not-allowed bg-jumpa-neutral-100 text-jumpa-black/80 font-medium`}
                />
              </Field>

              {/* Narration is never read by the rails — hidden at the client's
                  ask. `form.note` still exists, so this is one block to restore.
              <Field label="Narration/Remark (Optional)">
                <input
                  value={form.note}
                  onChange={(event) => set({ note: event.target.value })}
                  placeholder="Withdrawal"
                  className={FIELD_INPUT}
                />
              </Field>
              */}

              <p className="flex items-center gap-2 rounded-surface bg-jumpa-primary-50 px-3 py-3.5">
                <ShieldCheckIcon
                  aria-hidden="true"
                  className="size-5 shrink-0 text-jumpa-primary-600"
                />
                <span className="text-[10px] leading-3.5 font-medium text-jumpa-primary-600">
                  {country.routing
                    ? "ACH transfer typically arrives within 1-2 business days"
                    : `${country.currency} transfers typically arrive within seconds`}
                </span>
              </p>
            </>
          ) : null}
        </>
      )}

      <Button variant="gradient" size="lg" className="mt-auto" onClick={submit}>
        Continue
      </Button>
    </div>
  );
}
