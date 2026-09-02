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
import { CircleInformationIcon } from "@/components/ui/icons/circle-information";
import { GlobeIcon } from "@/components/ui/icons/globe";
import { ShieldCheckIcon } from "@/components/ui/icons/shield-check";
import { SegmentedToggle } from "@/components/ui/segmented-toggle";
import { MOBILE_NETWORKS, PHONE_NUMBER_MIN } from "@/lib/bills";
import {
  ACCOUNT_NUMBER_MIN,
  BANKS,
  type BankAccount,
  COUNTRIES,
  RECENT_BANK_ACCOUNTS,
  resolveAccountName,
} from "@/lib/transfer";

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
  phone: string;
};

export const EMPTY_BANK_FORM: BankForm = {
  destination: "bank",
  country: "",
  account: "",
  bank: "",
  routing: "",
  name: "",
  note: "",
  network: "",
  phone: "",
};

const DESTINATIONS = [
  { value: "bank" as const, label: "To bank" },
  { value: "momo" as const, label: "Mobile money" },
];

const COUNTRY_OPTIONS = COUNTRIES.map((entry) => ({
  value: entry.label,
  label: `${entry.label} - ${entry.currency}`,
}));

const NETWORK_OPTIONS = MOBILE_NETWORKS.map((network) => ({
  value: `Momo - ${network.label}`,
  label: `Momo - ${network.label}`,
  icon: network.logo,
}));

/** Recipient details. Recents are offered until a country picks the rails. */
export function BankTransferForm({
  form,
  onChange,
  onPickRecent,
  onContinue,
}: {
  form: BankForm;
  onChange: (next: BankForm) => void;
  onPickRecent: (account: BankAccount) => void;
  onContinue: () => void;
}) {
  const country = COUNTRIES.find((entry) => entry.label === form.country);
  const momo = form.destination === "momo";
  const set = (patch: Partial<BankForm>) => onChange({ ...form, ...patch });
  const ready = momo
    ? Boolean(form.country && form.network && form.phone)
    : Boolean(form.country && form.account && form.bank);

  const [resolving, setResolving] = useState(false);
  // Whichever pair identifies the recipient on the rail in play.
  const holder = momo ? form.network : form.bank;
  const reference = momo ? form.phone : form.account;
  const minimum = momo ? PHONE_NUMBER_MIN : ACCOUNT_NUMBER_MIN;

  // The lookup resolves after a delay; patch whatever the form holds by then,
  // not the snapshot it started from, or a narration typed meanwhile is lost.
  const latest = useRef(form);
  latest.current = form;

  // Only the pair above should retrigger the lookup — re-running it on every
  // other keystroke would overwrite a name the user has edited.
  // biome-ignore lint/correctness/useExhaustiveDependencies: onChange is read through latest.current, and adding it would refire on every keystroke
  useEffect(() => {
    if (reference.replace(/\D/g, "").length < minimum || !holder) return;

    let live = true;
    setResolving(true);
    resolveAccountName(holder, reference)
      .then((name) => {
        if (live) onChange({ ...latest.current, name });
      })
      .finally(() => {
        if (live) setResolving(false);
      });

    return () => {
      live = false;
    };
  }, [holder, reference, minimum]);

  return (
    <div className="flex flex-1 flex-col gap-5 pt-6">
      <SelectField
        label="Select country"
        icon={<GlobeIcon aria-hidden="true" className="size-6 shrink-0" />}
        value={form.country}
        placeholder="Select Country"
        options={COUNTRY_OPTIONS}
        onChange={(next) => set({ country: next })}
      />

      <SegmentedToggle
        variant="split"
        options={DESTINATIONS}
        value={form.destination}
        onChange={(destination) => set({ destination })}
      />

      {momo ? (
        <>
          <SelectField
            label="Mobile network"
            icon={<GlobeIcon aria-hidden="true" className="size-6 shrink-0" />}
            value={form.network}
            placeholder="Select network"
            options={NETWORK_OPTIONS}
            onChange={(next) => set({ network: next })}
          />

          <Field label="Phone number">
            <input
              value={form.phone}
              onChange={(event) => set({ phone: event.target.value })}
              inputMode="tel"
              placeholder="234XXX9320"
              className={FIELD_INPUT}
            />
            <PasteAction onPaste={(text) => set({ phone: text.trim() })} />
          </Field>
        </>
      ) : (
        <>
          <Field label="Account number">
            <input
              value={form.account}
              onChange={(event) => set({ account: event.target.value })}
              inputMode="numeric"
              placeholder="234XXX9320"
              className={FIELD_INPUT}
            />
            <PasteAction onPaste={(text) => set({ account: text.trim() })} />
          </Field>

          <div className="flex flex-col gap-2">
            <FieldLabel>Search bank</FieldLabel>
            <Combobox
              label="Search bank"
              value={form.bank}
              options={BANKS[country?.code ?? ""] ?? []}
              placeholder="Search"
              onValueChange={(next) => set({ bank: next })}
            />
          </div>

          {country?.routing ? (
            <Field label="Routing number">
              <input
                value={form.routing}
                onChange={(event) => set({ routing: event.target.value })}
                inputMode="numeric"
                placeholder="021000021"
                className={FIELD_INPUT}
              />
            </Field>
          ) : null}

          {country ? (
            <>
              <Field label="Account name">
                <input
                  value={form.name}
                  onChange={(event) => set({ name: event.target.value })}
                  placeholder={
                    resolving ? "Verifying account…" : "Account name"
                  }
                  className={FIELD_INPUT}
                />
              </Field>

              <Field label="Narration/Remark (Optional)">
                <input
                  value={form.note}
                  onChange={(event) => set({ note: event.target.value })}
                  placeholder="Withdrawal"
                  className={FIELD_INPUT}
                />
              </Field>

              <p className="flex items-center gap-2 rounded-surface bg-jumpa-primary-50 px-3 py-3.5">
                <ShieldCheckIcon
                  aria-hidden="true"
                  className="size-5 shrink-0 text-jumpa-primary-600"
                />
                <span className="text-[10px] leading-3.5 font-medium text-jumpa-primary-600">
                  {country.routing
                    ? "ACH transfer typically arrives within 1-2 business days"
                    : `${country.currency} transfers typically arrive within minutes`}
                </span>
              </p>
            </>
          ) : (
            RECENT_BANK_ACCOUNTS.length > 0 && (
              <section className="flex flex-col gap-3">
                <h2 className="text-xs leading-5 font-medium text-jumpa-black">
                  Recent accounts
                </h2>
                <ul className="flex flex-col gap-4 rounded-surface bg-jumpa-primary-50 px-4 py-4">
                  {RECENT_BANK_ACCOUNTS.map((entry) => (
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
            )
          )}
        </>
      )}

      <Button
        variant="gradient"
        size="lg"
        className="mt-auto"
        disabled={!ready}
        onClick={onContinue}
      >
        Continue
      </Button>
    </div>
  );
}
