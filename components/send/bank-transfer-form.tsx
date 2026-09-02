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
import {
  ACCOUNT_NUMBER_MIN,
  BANKS,
  type BankAccount,
  COUNTRIES,
  RECENT_BANK_ACCOUNTS,
  resolveAccountName,
} from "@/lib/transfer";

export type BankForm = {
  country: string;
  account: string;
  bank: string;
  routing: string;
  name: string;
  note: string;
};

export const EMPTY_BANK_FORM: BankForm = {
  country: "",
  account: "",
  bank: "",
  routing: "",
  name: "",
  note: "",
};

const COUNTRY_OPTIONS = COUNTRIES.map((entry) => ({
  value: entry.label,
  label: entry.label,
  caption: entry.currency,
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
  const set = (patch: Partial<BankForm>) => onChange({ ...form, ...patch });
  const ready = Boolean(form.country && form.account && form.bank);

  const [resolving, setResolving] = useState(false);
  const { account, bank } = form;

  // The lookup resolves after a delay; patch whatever the form holds by then,
  // not the snapshot it started from, or a narration typed meanwhile is lost.
  const latest = useRef(form);
  latest.current = form;

  // Account number + bank is what the rails need to return the holder's name.
  // biome-ignore lint/correctness/useExhaustiveDependencies: those two are the only trigger; re-running on every other keystroke would overwrite an edited name
  useEffect(() => {
    if (account.replace(/\D/g, "").length < ACCOUNT_NUMBER_MIN || !bank) return;

    let live = true;
    setResolving(true);
    resolveAccountName(bank, account)
      .then((name) => {
        if (live) onChange({ ...latest.current, name });
      })
      .finally(() => {
        if (live) setResolving(false);
      });

    return () => {
      live = false;
    };
  }, [account, bank]);

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
              placeholder={resolving ? "Verifying account…" : "Account name"}
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
