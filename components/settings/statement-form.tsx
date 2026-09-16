"use client";

import { useState } from "react";
import { AccountSheet } from "@/components/settings/account-sheet";
import { settingsHref } from "@/components/settings/sections";
import { TransferPinSheet } from "@/components/transfer/transfer-pin-sheet";
import { TransferSuccess } from "@/components/transfer/transfer-success";
import { BackButton, BackLink } from "@/components/ui/back-link";
import { Button } from "@/components/ui/button";
import { DateField } from "@/components/ui/date-field";
import { FieldError } from "@/components/ui/field-error";
import { DownloadIcon } from "@/components/ui/icons/download";
import { FileArrowDownAltIcon } from "@/components/ui/icons/file-arrow-down-alt";
import { HouseAltIcon } from "@/components/ui/icons/house-alt";
import { MailIcon } from "@/components/ui/icons/mail";
import { ReceiptAltIcon } from "@/components/ui/icons/receipt-alt";
import { cn } from "@/lib/cn";
import { displayDate } from "@/lib/savings";
import {
  STATEMENT_CHIPS,
  STATEMENT_KINDS,
  type StatementKind,
  statementTitle,
} from "@/lib/statements";

/** Shared shape of the four fields. */
const FIELD =
  "flex h-12 w-full items-center gap-2 rounded-pill bg-jumpa-neutral-50 pr-5.25 pl-6 text-sm leading-4 font-medium text-jumpa-black outline-none";

/** The kind chips: which history the statement covers. */
const CHIP =
  "tap flex h-11 min-w-16 items-center justify-center rounded-pill px-4 text-xs leading-3.5 font-medium whitespace-nowrap active:scale-[0.98]";
const CHIP_ON = "bg-jumpa-primary-50 text-jumpa-primary-600";
const CHIP_OFF = "bg-jumpa-neutral-50 text-jumpa-primary-950";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** The two formats are one choice, not two actions — you leave with one file. */
const FORMATS = [
  { id: "pdf", label: "Download (PDF)", icon: DownloadIcon },
  { id: "csv", label: "Download (CSV)", icon: FileArrowDownAltIcon },
] as const;

type Format = (typeof FORMATS)[number]["id"];

type Stage = "form" | "confirm" | "pin" | "done";

function Label({ children }: { children: string }) {
  return (
    <span className="text-sm leading-4 font-medium text-jumpa-black">
      {children}
    </span>
  );
}

/**
 * One of the format pair. A real radio rather than `aria-pressed`, so the two
 * pills announce as the single choice they are.
 */
function FormatOption({
  id,
  label,
  icon: Icon,
  checked,
  onSelect,
}: {
  id: Format;
  label: string;
  icon: typeof DownloadIcon;
  checked: boolean;
  onSelect: () => void;
}) {
  return (
    <label
      className={cn(
        "tap flex h-14 flex-1 items-center justify-center gap-2 rounded-pill border text-xs leading-3.5 active:scale-[0.98]",
        checked
          ? "border-jumpa-primary-600 bg-jumpa-primary-50 font-medium text-jumpa-primary-600"
          : "border-jumpa-neutral-200 bg-jumpa-white text-jumpa-black",
      )}
    >
      <input
        type="radio"
        name="statement-format"
        value={id}
        checked={checked}
        onChange={onSelect}
        className="sr-only"
      />
      <Icon
        className={cn(
          "size-6 shrink-0",
          checked ? "text-jumpa-primary-600" : "text-jumpa-primary-950",
        )}
      />
      {label}
    </label>
  );
}

/** One line of the confirm sheet's review. */
function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="shrink-0 text-[10px] leading-4 text-jumpa-black/50">
        {label}
      </dt>
      <dd className="min-w-0 truncate text-xs leading-4 font-medium text-jumpa-black">
        {value}
      </dd>
    </div>
  );
}

/**
 * The statement request. Pick a range, a delivery address and one format, then
 * review it and authorise with the transaction PIN.
 *
 * Reached two ways: `?section=statements&kind=` under Settings, and as a stage
 * of `/transactions` behind "Download Statement". `onBack` is what the second
 * one needs — those stages share a URL, so a history step is wrong.
 */
export function StatementForm({
  kind: initialKind,
  back = settingsHref("statements"),
  onBack,
  accountEmail = "",
}: {
  kind: StatementKind;
  /** Direct-load fallback, and where the receipt exits to. */
  back?: string;
  /** Set when this screen is a stage at an unchanged URL. */
  onBack?: () => void;
  /** The address the account signed up with; the field starts on it. */
  accountEmail?: string;
}) {
  const [stage, setStage] = useState<Stage>("form");
  // The chip row is the kind, so the title follows it.
  const [kind, setKind] = useState<StatementKind>(initialKind);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [email, setEmail] = useState(accountEmail);
  const [address, setAddress] = useState("");
  const [format, setFormat] = useState<Format>("pdf");
  const [error, setError] = useState<string>();
  const [pinError, setPinError] = useState(false);
  const [pending, setPending] = useState(false);

  const title = statementTitle(kind);

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
    setStage("confirm");
  };

  const authorise = async (pin: string) => {
    setPending(true);
    try {
      const res = await fetch("/api/wallet/verify-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      if (!res.ok) {
        setPinError(true);
        return;
      }
      // TODO(backend): there is no statement service yet, so nothing is
      // generated or mailed — the receipt is the end of the flow.
      setStage("done");
    } catch {
      setPinError(true);
    } finally {
      setPending(false);
    }
  };

  if (stage === "done") {
    return (
      <TransferSuccess
        back={back}
        compact
        titleFirst
        title="Successful"
        amount="Statement requested"
        note={
          <>
            Your {format.toUpperCase()} statement will be sent to{" "}
            {email.trim() || "your registered email"} within 10 minutes.
          </>
        }
        /* Nothing to open and nothing to share — a statement arrives by mail. */
        actions={null}
      />
    );
  }

  return (
    <div className="flex min-h-dvh flex-col px-4.5 pt-[calc(env(safe-area-inset-top)+21px)] pb-[calc(24px+env(safe-area-inset-bottom))]">
      {/* The design sets the back control and the title side by side, not centred. */}
      <header className="flex h-11 items-center gap-6">
        {onBack ? (
          <BackButton onClick={onBack} variant="corner" label="Back" />
        ) : (
          <BackLink href={back} variant="corner" label="Back" />
        )}
        <h1 className="text-lg leading-4.5 font-medium text-jumpa-black">
          {title}
        </h1>
      </header>

      <main className="mt-7.5 flex flex-1 flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label>Transaction Type</Label>
          <div className="flex flex-wrap items-center gap-2">
            {STATEMENT_CHIPS.map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={kind === option}
                onClick={() => setKind(option)}
                className={cn(CHIP, kind === option ? CHIP_ON : CHIP_OFF)}
              >
                {STATEMENT_KINDS[option].chip}
              </button>
            ))}
          </div>
        </div>

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

        {/* Optional: a statement used as proof of address carries one, a plain
            history does not. */}
        <label className="flex flex-col gap-2">
          <Label>Add home address</Label>
          <span className={FIELD}>
            <HouseAltIcon className="size-6 shrink-0 text-jumpa-primary-600" />
            <input
              type="text"
              autoComplete="street-address"
              placeholder="Your home address"
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-jumpa-neutral-500"
            />
          </span>
        </label>

        <div className="flex flex-col gap-2">
          <Label>Download format</Label>
          <div className="flex items-center gap-4">
            {FORMATS.map((option) => (
              <FormatOption
                key={option.id}
                {...option}
                checked={format === option.id}
                onSelect={() => setFormat(option.id)}
              />
            ))}
          </div>
        </div>

        <FieldError>{error}</FieldError>
      </main>

      <Button variant="gradient" size="lg" onClick={submit} className="mt-6">
        Continue
      </Button>

      {stage === "confirm" ? (
        <AccountSheet
          icon={<ReceiptAltIcon className="size-8" />}
          tone="brand"
          title="Kindly Confirm"
          confirmLabel="Yes, Continue"
          pendingLabel="Please wait"
          pending={false}
          onConfirm={() => setStage("pin")}
          onClose={() => setStage("form")}
        >
          <p className="text-center text-xs leading-4 text-jumpa-black">
            Please review your request. We will prepare the statement and send
            it to you.
          </p>

          <dl className="flex flex-col gap-2.5 rounded-card bg-jumpa-neutral-50 px-4 py-3.5">
            <ReviewRow label="Statement" value={title} />
            <ReviewRow
              label="Period"
              value={`${displayDate(from)} — ${displayDate(to)}`}
            />
            <ReviewRow label="Format" value={format.toUpperCase()} />
            {email.trim() ? (
              <ReviewRow label="Email" value={email.trim()} />
            ) : null}
            {address.trim() ? (
              <ReviewRow label="Home address" value={address.trim()} />
            ) : null}
          </dl>
        </AccountSheet>
      ) : null}

      {stage === "pin" ? (
        <TransferPinSheet
          error={pinError}
          pending={pending}
          pendingLabel="Verifying your PIN"
          onComplete={authorise}
          onRetry={() => setPinError(false)}
          onClose={() => setStage("confirm")}
        />
      ) : null}
    </div>
  );
}
