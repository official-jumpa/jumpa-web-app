"use client";

import { useState } from "react";
import { settingsHref } from "@/components/settings/sections";
import { BackLink } from "@/components/ui/back-link";
import { Button } from "@/components/ui/button";
import { DateField } from "@/components/ui/date-field";
import { FieldError } from "@/components/ui/field-error";
import { DownloadIcon } from "@/components/ui/icons/download";
import { FileArrowDownAltIcon } from "@/components/ui/icons/file-arrow-down-alt";
import { MailIcon } from "@/components/ui/icons/mail";
import { type StatementKind, statementTitle } from "@/lib/statements";

/** Shared shape of the three fields and the two download pills. */
const FIELD =
  "flex h-12 w-full items-center gap-2 rounded-pill bg-jumpa-neutral-50 pr-5.25 pl-6 text-sm leading-4 font-medium text-jumpa-black outline-none";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function Label({ children }: { children: string }) {
  return (
    <span className="text-sm leading-4 font-medium text-jumpa-black">
      {children}
    </span>
  );
}

/** White bordered pill. Both download formats are the same control. */
function DownloadButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof DownloadIcon;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="tap flex h-14 flex-1 items-center justify-center gap-2 rounded-pill border border-jumpa-neutral-200 bg-jumpa-white text-xs leading-3.5 text-jumpa-black active:scale-[0.98]"
    >
      <Icon className="size-6 shrink-0 text-jumpa-primary-600" />
      {label}
    </button>
  );
}

/** `?section=statements&kind=`. Picks a range, then mails or downloads it. */
export function StatementForm({ kind }: { kind: StatementKind }) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string>();
  const [sent, setSent] = useState(false);

  /** Every action on this screen needs the same range. */
  const check = () => {
    if (!from || !to) {
      setError("Choose the start and end dates for the statement.");
      return false;
    }
    if (from > to) {
      setError("The end date cannot be before the start date.");
      return false;
    }
    if (email.trim() && !EMAIL.test(email.trim())) {
      setError("That does not look like an email address.");
      return false;
    }
    setError(undefined);
    return true;
  };

  const submit = () => {
    if (!check()) return;
    setSent(true);
  };

  return (
    <div className="flex min-h-dvh flex-col px-4.5 pt-[calc(env(safe-area-inset-top)+21px)] pb-[calc(24px+env(safe-area-inset-bottom))]">
      {/* The design sets the back control and the title side by side, not centred. */}
      <header className="flex h-11 items-center gap-6">
        <BackLink
          href={settingsHref("statements")}
          variant="corner"
          label="Back"
        />
        <h1 className="text-lg leading-4.5 font-medium text-jumpa-black">
          {statementTitle(kind)}
        </h1>
      </header>

      <main className="mt-7.5 flex flex-1 flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label>Start Date</Label>
          <DateField
            label="Start date"
            variant="statement"
            placeholder="From YYYY-MM-DD"
            value={from}
            max={to || undefined}
            onChange={(next) => {
              setFrom(next);
              setError(undefined);
            }}
          />
        </div>

        {/* The frame labels this "Additional email address" too — a slip; it is
            the other end of the range. */}
        <div className="flex flex-col gap-2">
          <Label>End Date</Label>
          <DateField
            label="End date"
            variant="statement"
            placeholder="To YYYY-MM-DD"
            value={to}
            min={from || undefined}
            onChange={(next) => {
              setTo(next);
              setError(undefined);
            }}
          />
        </div>

        <label className="flex flex-col gap-2">
          <Label>Additional email address</Label>
          <span className={FIELD}>
            <MailIcon className="size-6 shrink-0 text-jumpa-primary-600" />
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setError(undefined);
              }}
              className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-jumpa-neutral-500"
            />
          </span>
        </label>

        <div className="flex items-center gap-4">
          <DownloadButton
            icon={DownloadIcon}
            label="Download (PDF)"
            onClick={submit}
          />
          <DownloadButton
            icon={FileArrowDownAltIcon}
            label="Download (CSV)"
            onClick={submit}
          />
        </div>

        <FieldError>{error}</FieldError>

        {sent ? (
          <output className="text-xs leading-4 font-medium text-jumpa-success">
            Your statement is being prepared. We'll send it to you when it's
            ready.
          </output>
        ) : null}
      </main>

      <Button variant="gradient" size="lg" onClick={submit} className="mt-6">
        Continue
      </Button>
    </div>
  );
}
