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
import { HouseAltIcon } from "@/components/ui/icons/house-alt";
import { MailIcon } from "@/components/ui/icons/mail";
import { ReceiptAltIcon } from "@/components/ui/icons/receipt-alt";
import { cn } from "@/lib/cn";
import { displayDate } from "@/lib/savings";
import {
  MAX_STATEMENT_DAYS,
  STATEMENT_CHIPS,
  STATEMENT_DURATIONS,
  STATEMENT_KINDS,
  type StatementDuration,
  type StatementKind,
} from "@/lib/statements";
import {
  downloadStatementBlob,
  generateStatementPdf,
} from "@/lib/statement-pdf";

const FIELD =
  "flex h-12 w-full items-center gap-2 rounded-pill bg-jumpa-neutral-50 pr-5.25 pl-6 text-sm leading-4 font-medium text-jumpa-black outline-none";

const CHIP =
  "tap flex h-10 min-w-16 items-center justify-center rounded-pill px-4 text-xs leading-3.5 font-medium whitespace-nowrap active:scale-[0.98]";
const CHIP_ON = "bg-jumpa-primary-50 text-jumpa-primary-600";
const CHIP_OFF = "bg-jumpa-neutral-50 text-jumpa-primary-950";

type Stage = "form" | "confirm" | "pin" | "generating" | "done";

function Label({ children }: { children: string }) {
  return (
    <span className="text-sm leading-4 font-medium text-jumpa-black">
      {children}
    </span>
  );
}

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

function toIsoDay(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function defaultDates(daysAgo = 30) {
  const now = new Date();
  const past = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
  return {
    from: toIsoDay(past),
    to: toIsoDay(now),
  };
}

export function StatementSheet({
  kind: initialKind = "all",
  back = settingsHref(),
  onBack,
  accountEmail = "",
}: {
  kind?: StatementKind;
  back?: string;
  onBack?: () => void;
  accountEmail?: string;
}) {
  const normInitial =
    initialKind === "general"
      ? "all"
      : initialKind === "usd"
        ? "crypto"
        : initialKind === "ngn"
          ? "fiat"
          : initialKind;

  const [kind, setKind] = useState<StatementKind>(normInitial);
  const [duration, setDuration] = useState<StatementDuration>("30d");

  const initialRange = defaultDates(30);
  const [from, setFrom] = useState(initialRange.from);
  const [to, setTo] = useState(initialRange.to);
  const [address, setAddress] = useState("");
  const [stage, setStage] = useState<Stage>("form");
  const [error, setError] = useState<string>();
  const [pinError, setPinError] = useState(false);
  const [pinErrorMessage, setPinErrorMessage] = useState<string>();
  const [pending, setPending] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [statementRef, setStatementRef] = useState<string>("");

  const title = "Account Statement";

  const applyDuration = (dur: StatementDuration) => {
    setDuration(dur);
    setError(undefined);
    if (dur === "7d") {
      const range = defaultDates(7);
      setFrom(range.from);
      setTo(range.to);
    } else if (dur === "30d") {
      const range = defaultDates(30);
      setFrom(range.from);
      setTo(range.to);
    } else if (dur === "90d") {
      const range = defaultDates(90);
      setFrom(range.from);
      setTo(range.to);
    }
  };

  const validate = (): boolean => {
    if (!from || !to) {
      setError("Please select both a start date and an end date.");
      return false;
    }
    const startDate = new Date(from);
    const endDate = new Date(to);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      setError("Please provide valid dates.");
      return false;
    }
    if (startDate > endDate) {
      setError("The end date cannot be earlier than the start date.");
      return false;
    }

    const diffDays = Math.round(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (diffDays > MAX_STATEMENT_DAYS) {
      setError(
        `Statement duration cannot exceed 3 months (maximum ${MAX_STATEMENT_DAYS} days). Your selection is ${diffDays} days.`,
      );
      return false;
    }

    setError(undefined);
    return true;
  };

  const submit = () => {
    if (!validate()) return;
    setStage("confirm");
  };

  const authorise = async (pin: string) => {
    setPending(true);
    setPinError(false);
    setPinErrorMessage(undefined);

    try {
      const normKind =
        kind === "general"
          ? "all"
          : kind === "usd"
            ? "crypto"
            : kind === "ngn"
              ? "fiat"
              : kind;

      const res = await fetch("/api/v1/user/statement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from,
          to,
          currency: normKind,
          homeAddress: address.trim() || undefined,
          pin,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success || !data.statement) {
        setPinError(true);
        setPinErrorMessage(data.error || "Verification failed");
        return;
      }

      setStatementRef(data.statement.statementId || "");
      setGenerating(true);

      // Generate & trigger direct browser download
      try {
        const blob = await generateStatementPdf(data.statement);
        const cleanId = String(data.statement.statementId || "").replace(/^stmt_?/i, "");
        const filename = `jumpa-statement-${cleanId || "export"}.pdf`;
        downloadStatementBlob(blob, filename);
      } catch (pdfErr) {
        console.error("[StatementSheet] Failed to render PDF:", pdfErr);
      } finally {
        setGenerating(false);
      }

      setStage("done");
    } catch (err: any) {
      setPinError(true);
      setPinErrorMessage(err?.message || "Failed to process statement request");
    } finally {
      setPending(false);
      setGenerating(false);
    }
  };

  if (stage === "done") {
    return (
      <TransferSuccess
        back={back}
        compact
        titleFirst
        title="Successful"
        amount="Statement Generated"
        note={
          <>
            Your account statement is ready for download
          </>
        }
        actions={null}
      />
    );
  }

  return (
    <div className="flex min-h-dvh flex-col px-4.5 pt-[calc(env(safe-area-inset-top)+21px)] pb-[calc(24px+env(safe-area-inset-bottom))]">
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

      <main className="mt-6 flex flex-1 flex-col gap-8">
        {/* Currency Scope */}
        <div className="flex flex-col gap-2">
          <Label>Transaction Type</Label>
          <div className="flex flex-wrap items-center gap-2">
            {STATEMENT_CHIPS.map((chipKey) => (
              <button
                key={chipKey}
                type="button"
                aria-pressed={kind === chipKey}
                onClick={() => setKind(chipKey)}
                className={cn(CHIP, kind === chipKey ? CHIP_ON : CHIP_OFF)}
              >
                {STATEMENT_KINDS[chipKey].chip}
              </button>
            ))}
          </div>
        </div>

        {/* Duration Quick Presets */}
        <div className="flex flex-col gap-2">
          <Label>Duration</Label>
          <div className="flex flex-wrap items-center gap-1.5">
            {STATEMENT_DURATIONS.map((dur) => (
              <button
                key={dur.id}
                type="button"
                aria-pressed={duration === dur.id}
                onClick={() => applyDuration(dur.id)}
                className={cn(CHIP, duration === dur.id ? CHIP_ON : CHIP_OFF)}
              >
                {dur.label}
              </button>
            ))}
          </div>
        </div>

        {/* Date Pickers (Custom range or adjustments) */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-2">
            <Label>Start Date</Label>
            <DateField
              label="Start date"
              variant="statement"
              placeholder="YYYY-MM-DD"
              value={from}
              max={to || undefined}
              onChange={(next) => {
                setFrom(next);
                setDuration("custom");
                setError(undefined);
              }}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label>End Date</Label>
            <DateField
              label="End date"
              variant="statement"
              placeholder="YYYY-MM-DD"
              value={to}
              min={from || undefined}
              onChange={(next) => {
                setTo(next);
                setDuration("custom");
                setError(undefined);
              }}
            />
          </div>
        </div>

        {/* Delivery / Registered Email */}
        <div className="flex flex-col gap-2">
          <Label>Email Address</Label>
          <div className={cn(FIELD, "cursor-not-allowed bg-jumpa-neutral-100/70 opacity-90")}>
            <MailIcon className="size-6 shrink-0 text-jumpa-primary-600" />
            <span className="min-w-0 flex-1 truncate text-jumpa-neutral-600">
              {accountEmail || "Registered account email"}
            </span>
          </div>
          <span className="text-[11px] leading-3.5 text-jumpa-neutral-500">
            Official statements are sent to your verified email address.
          </span>
        </div>

        {/* Home Address (Optional - For Proof of Address) */}
        {/* Home address not sorted out yet */}
        {/* <label className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <Label>Add Home Address</Label>
            <span className="text-[10px] text-jumpa-neutral-400">Optional</span>
          </div>
          <span className={FIELD}>
            <HouseAltIcon className="size-6 shrink-0 text-jumpa-primary-600" />
            <input
              type="text"
              autoComplete="street-address"
              placeholder="Your residential address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-jumpa-neutral-500"
            />
          </span>
          <span className="text-[11px] leading-3.5 text-jumpa-neutral-500">
            Include residential address if using this statement as proof of address.
          </span>
        </label> */}

        {/* Download Format */}
        <div className="flex flex-col gap-2">
          <Label>Download Format</Label>
          <div className="flex h-14 w-full items-center justify-between rounded-pill border border-jumpa-primary-600 bg-jumpa-primary-50 px-5 text-xs font-medium text-jumpa-primary-600">
            <span className="flex items-center gap-2.5">
              <DownloadIcon className="size-5 shrink-0 text-jumpa-primary-600" />
              <span>PDF</span>
            </span>
          </div>
        </div>

        <FieldError>{error}</FieldError>
      </main>

      <Button variant="gradient" size="lg" onClick={submit} className="mt-6">
        Continue
      </Button>

      {/* Confirmation Bottom Sheet */}
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
            Please review your request. We will generate your official account
            statement for the selected period.
          </p>

          <dl className="flex flex-col gap-2.5 rounded-card bg-jumpa-neutral-50 px-4 py-3.5">
            <ReviewRow label="Statement Scope" value={title} />
            <ReviewRow
              label="Period (Max 3 Mos)"
              value={`${displayDate(from)} — ${displayDate(to)}`}
            />
            <ReviewRow label="Format" value="PDF" />
            {accountEmail ? (
              <ReviewRow label="Email" value={accountEmail} />
            ) : null}
            {address.trim() ? (
              <ReviewRow label="Home Address" value={address.trim()} />
            ) : null}
          </dl>
        </AccountSheet>
      ) : null}

      {/* Transaction PIN Verification Sheet */}
      {stage === "pin" ? (
        <TransferPinSheet
          error={pinError}
          pending={pending}
          pendingLabel={
            generating
              ? "Generating PDF Statement..."
              : "Verifying your PIN"
          }
          onComplete={authorise}
          onRetry={() => {
            setPinError(false);
            setPinErrorMessage(undefined);
          }}
          onClose={() => setStage("confirm")}
        />
      ) : null}
    </div>
  );
}
