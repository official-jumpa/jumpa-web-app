"use client";

import { useEffect, useState } from "react";
import {
  FIELD_INPUT,
  Field,
  FieldLabel,
  PasteAction,
} from "@/components/transfer/field";
import { OptionRow } from "@/components/transfer/option-row";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { FieldError } from "@/components/ui/field-error";
import { CircleInformationIcon } from "@/components/ui/icons/circle-information";
import { ShieldCheckIcon } from "@/components/ui/icons/shield-check";
import { supportedBanks } from "@/lib/constants/banks";
import { nimiqApi } from "@/lib/nimiq/api-client";
import type { SavedBank } from "@/lib/nimiq/recipients";
import { ACCOUNT_NUMBER_MIN, titleCaseName } from "@/lib/transfer";

export type BankDetails = {
  accountNumber: string;
  /** The bank as picked from the list; the server resolves its codes. */
  bank: string;
  /** Filled by the name check; empty until it passes. */
  accountName: string;
  bankName: string;
};

export const EMPTY_BANK_DETAILS: BankDetails = {
  accountNumber: "",
  bank: "",
  accountName: "",
  bankName: "",
};

// The list repeats a few names (one per sort code); the picker needs each once.
const BANK_OPTIONS = [...new Set(supportedBanks.map((b) => b.name))];

const digitsOf = (value: string) => value.replace(/\D/g, "");

/** Account number and bank, with the holder's name confirmed before Continue. */
export function CashOutBankForm({
  value,
  saved,
  onChange,
  onContinue,
}: {
  value: BankDetails;
  /** Accounts paid before; picking one fills the form and re-checks the name. */
  saved: SavedBank[];
  /** Must be stable (a state setter): the name check re-runs when it changes. */
  onChange: (next: BankDetails) => void;
  onContinue: () => void;
}) {
  const [checking, setChecking] = useState(false);
  const [lookupError, setLookupError] = useState<string>();
  const [showErrors, setShowErrors] = useState(false);

  const accountNumber = digitsOf(value.accountNumber);
  const ready = accountNumber.length === ACCOUNT_NUMBER_MIN && value.bank;

  // Re-checks the name whenever the number or the bank changes.
  useEffect(() => {
    if (!ready) return;
    const controller = new AbortController();
    setChecking(true);
    setLookupError(undefined);
    nimiqApi
      .lookUpBank(accountNumber, value.bank, { signal: controller.signal })
      .then((found) =>
        onChange({
          accountNumber,
          bank: value.bank,
          accountName: titleCaseName(found.accountName),
          bankName: found.bankName,
        }),
      )
      .catch((failure: Error) => {
        if (!controller.signal.aborted) setLookupError(failure.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setChecking(false);
      });
    return () => controller.abort();
  }, [ready, accountNumber, value.bank, onChange]);

  const edit = (patch: Partial<BankDetails>) =>
    onChange({ ...value, ...patch, accountName: "", bankName: "" });

  const pick = (entry: SavedBank) => {
    setShowErrors(false);
    onChange({
      ...EMPTY_BANK_DETAILS,
      accountNumber: entry.accountNumber,
      bank: entry.bank,
    });
  };

  const accountError =
    showErrors && accountNumber.length !== ACCOUNT_NUMBER_MIN
      ? "Enter the 10-digit account number."
      : undefined;
  const bankError = showErrors && !value.bank ? "Choose the bank." : undefined;

  const submit = () => {
    setShowErrors(true);
    if (ready && value.accountName && !checking) onContinue();
  };

  return (
    <div className="flex flex-1 flex-col gap-5 pt-6">
      {!value.accountNumber && saved.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-xs leading-5 font-medium text-jumpa-black">
            Recent accounts
          </h2>
          <ul className="flex flex-col gap-4 rounded-surface bg-jumpa-primary-50 px-4 py-4">
            {saved.map((entry) => (
              <li key={`${entry.bank}-${entry.accountNumber}`}>
                <OptionRow
                  Icon={CircleInformationIcon}
                  title={entry.accountName}
                  caption={`${entry.bankName} - ${entry.accountNumber}`}
                  onClick={() => pick(entry)}
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <Field label="Account number" error={accountError}>
        <input
          value={value.accountNumber}
          onChange={(event) => edit({ accountNumber: event.target.value })}
          inputMode="numeric"
          autoComplete="off"
          maxLength={ACCOUNT_NUMBER_MIN}
          placeholder="0123456789"
          aria-invalid={Boolean(accountError)}
          className={FIELD_INPUT}
        />
        <PasteAction
          onPaste={(text) =>
            edit({ accountNumber: digitsOf(text).slice(0, ACCOUNT_NUMBER_MIN) })
          }
        />
      </Field>

      <div className="flex flex-col gap-2">
        <FieldLabel>Search bank</FieldLabel>
        <Combobox
          label="Search bank"
          value={value.bank}
          options={BANK_OPTIONS}
          placeholder="Search bank"
          invalid={Boolean(bankError)}
          onValueChange={(bank) => edit({ bank })}
        />
        <FieldError>{bankError}</FieldError>
      </div>

      <Field label="Account name" error={ready ? lookupError : undefined}>
        <input
          value={value.accountName}
          readOnly
          tabIndex={-1}
          placeholder={
            checking ? "Verifying account…" : "Account name (auto-verified)"
          }
          aria-invalid={Boolean(lookupError)}
          className={FIELD_INPUT}
        />
      </Field>

      <p className="flex items-center gap-2 rounded-surface bg-jumpa-primary-50 px-3 py-3.5">
        <ShieldCheckIcon
          aria-hidden="true"
          className="size-5 shrink-0 text-jumpa-primary-600"
        />
        <span className="text-xs leading-4 font-medium text-jumpa-primary-600">
          Naira is paid to this account only. We check the name first.
        </span>
      </p>

      <Button
        variant="gradient"
        size="lg"
        className="mt-auto"
        onClick={submit}
        disabled={checking}
      >
        {checking ? "Verifying…" : "Continue"}
      </Button>
    </div>
  );
}
