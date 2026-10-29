"use client";

import { useCallback, useState } from "react";
import { useAuthContext } from "@/components/auth/AuthGuard";
import { settingsHref } from "@/components/settings/sections";
import { SettingsHeader } from "@/components/settings/settings-header";
import { TransferPinSheet } from "@/components/transfer/transfer-pin-sheet";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
import { SheetPortal } from "@/components/ui/sheet-portal";
import { endSession, verifyTransactionPin } from "@/lib/account-session";
import type { AccountClosureChecks } from "@/lib/functions/accountClosureFunctions";

type Step = "form" | "confirm" | "pin";

const naira = (value: number) =>
  `₦${value.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const count = (n: number) => (n === 0 ? "None" : String(n));

/** Account closure: what is left on the account, a reason, consent, then the PIN. */
export function DeleteAccount({
  checks,
  name,
  image,
}: {
  checks: AccountClosureChecks;
  name?: string | null;
  image?: string | null;
}) {
  const auth = useAuthContext();
  const displayName = auth?.user?.nickname || auth?.user?.name || name || "";
  const photo = auth?.user?.image ?? image;

  const [step, setStep] = useState<Step>("form");
  const [reason, setReason] = useState("");
  const [consent, setConsent] = useState(false);
  const [consentError, setConsentError] = useState<string>();
  const [pinError, setPinError] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();

  const rows = [
    {
      label: "Wallet balance",
      value: naira(checks.ngnBalance),
      clear: checks.ngnBalance <= 0,
    },
    {
      label: "Pending transactions",
      value: count(checks.pendingTransactions),
      clear: checks.pendingTransactions === 0,
    },
    {
      label: "Active savings",
      value: count(checks.activeSavings),
      clear: checks.activeSavings === 0,
    },
  ];

  const onContinue = () => {
    if (!consent) {
      setConsentError("Tick the box to confirm you understand.");
      return;
    }
    setError(undefined);
    setStep("confirm");
  };

  const onPin = useCallback(
    async (pin: string) => {
      setPending(true);
      const check = await verifyTransactionPin(pin);
      if (!check.ok) {
        setPending(false);
        if (check.error === "Incorrect PIN") {
          setPinError(true);
          return;
        }
        // A lockout or a network failure: the PIN pad cannot help, so leave it.
        setStep("form");
        setError(check.error);
        return;
      }

      const failure = await endSession(
        "/api/v1/user",
        "Could not delete the account.",
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(reason.trim() ? { reason: reason.trim() } : {}),
        },
      );
      if (failure) {
        setPending(false);
        setStep("form");
        setError(failure);
      }
    },
    [reason],
  );

  return (
    <div className="flex min-h-dvh flex-col bg-jumpa-white px-5 pt-[calc(env(safe-area-inset-top)+21px)] pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
      <div className="-mx-1">
        <SettingsHeader
          back={settingsHref()}
          title="Delete account"
          size="strong"
        />
      </div>

      <div className="relative mx-auto mt-2.75 size-[103.119px]">
        {/* biome-ignore lint/performance/noImgElement: fixed-size SVG disc */}
        <img
          src="/images/delete-account/ellipse.svg"
          alt=""
          width={103.119}
          height={103.119}
          className="max-w-none"
        />
        {photo ? (
          // biome-ignore lint/performance/noImgElement: profile photos come from storage, not the optimiser
          <img
            src={photo}
            alt=""
            className="absolute inset-0 size-full rounded-full object-cover"
          />
        ) : (
          <span
            aria-hidden="true"
            className="absolute inset-0 flex items-center justify-center text-[46px] leading-none font-semibold tracking-[-0.14px] text-jumpa-alt-400"
          >
            {displayName.trim().charAt(0).toUpperCase() || "J"}
          </span>
        )}
        {/* biome-ignore lint/performance/noImgElement: fixed-size SVG badge */}
        <img
          src="/images/delete-account/cancel.svg"
          alt=""
          width={24}
          height={24}
          className="absolute top-17 left-20.75 max-w-none"
        />
      </div>

      <h2 className="mt-4.5 text-center text-[22px] leading-[1.1] font-bold tracking-jumpa-snug text-jumpa-ink">
        Before you go
      </h2>
      <p className="mt-3 text-center text-xs leading-[1.45] text-jumpa-ink-muted">
        Deleting your account closes your wallet and removes your profile and
        Jumpa tag. This can't be undone.
      </p>

      <ul className="mt-5.25 flex flex-col overflow-hidden rounded-3xl bg-jumpa-neutral-25 px-4.5 pt-4.5 pb-3">
        {rows.map((row, i) => (
          <li key={row.label} className="flex flex-col">
            {i > 0 ? (
              // biome-ignore lint/performance/noImgElement: hairline from the design
              <img
                src="/images/delete-account/line.svg"
                alt=""
                width={352}
                height={1}
                className="-mx-4.25 my-[9.5px] h-px max-w-none"
              />
            ) : null}
            <div className="flex h-5 items-center gap-2.5 text-xs tracking-jumpa-snug text-jumpa-ink">
              <span
                aria-hidden="true"
                className={`flex size-5 shrink-0 items-center justify-center rounded-pill text-[11px] font-bold text-jumpa-white ${
                  row.clear ? "bg-jumpa-success" : "bg-jumpa-warning"
                }`}
              >
                {row.clear ? "✓" : "!"}
              </span>
              <span className="flex-1">{row.label}</span>
              <span className="font-medium">{row.value}</span>
            </div>
          </li>
        ))}
      </ul>

      <p className="mt-3 text-xs leading-[1.4] text-jumpa-ink-muted">
        We're required to keep some transaction records for a number of years.
        Everything else is removed.
      </p>

      <label className="mt-5.5 flex flex-col gap-1.5">
        <span className="text-xs leading-3.75 font-medium tracking-jumpa-snug text-jumpa-ink-muted">
          Why are you leaving? (optional)
        </span>
        <input
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          maxLength={500}
          placeholder="State reason"
          className="h-14 rounded-panel border border-jumpa-lavender-200 bg-jumpa-neutral-25 px-4 text-xs tracking-jumpa-snug text-jumpa-ink outline-none placeholder:text-jumpa-ink-muted focus:border-jumpa-primary-600"
        />
      </label>

      <div className="mt-auto flex flex-col pt-4.5">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={consent}
            onChange={(event) => {
              setConsent(event.target.checked);
              setConsentError(undefined);
            }}
            aria-invalid={Boolean(consentError)}
            className="peer sr-only"
          />
          <span
            aria-hidden="true"
            className={`flex size-6 shrink-0 items-center justify-center rounded-[7px] text-[13px] font-bold text-jumpa-white peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-jumpa-primary-600 ${
              consent
                ? "bg-jumpa-primary-600"
                : "border border-jumpa-lavender-275 bg-jumpa-white"
            }`}
          >
            {consent ? "✓" : null}
          </span>
          <span className="text-xs leading-[1.35] tracking-[-0.02em] text-jumpa-ink">
            I understand my account can't be recovered after it's deleted.
          </span>
        </label>
        <div className="mt-2 empty:hidden">
          <FieldError>{consentError ?? error}</FieldError>
        </div>

        <div className="mt-6 flex flex-col gap-3">
          <Button variant="brandAccent" size="cta" onClick={onContinue}>
            Continue
          </Button>
          <Button variant="outline" size="cta" href={settingsHref()}>
            Keep my account
          </Button>
        </div>
      </div>

      {step === "confirm" ? (
        <SheetPortal look="account" onClose={() => setStep("form")}>
          <div className="flex flex-col gap-3.5">
            <div className="flex flex-col gap-2">
              <h2 className="text-[22px] leading-[1.1] font-bold tracking-jumpa-snug text-jumpa-ink">
                Delete your account?
              </h2>
              <p className="text-sm leading-[1.4] tracking-jumpa-snug text-jumpa-ink-muted">
                Enter your PIN to confirm. Your account closes straight away and
                you'll be signed out on every device.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <Button
                variant="brandAccent"
                size="cta"
                onClick={() => setStep("form")}
              >
                Keep my account
              </Button>
              <Button
                variant="outlineBrand"
                size="cta"
                onClick={() => setStep("pin")}
              >
                Yes, Delete Account
              </Button>
            </div>
          </div>
        </SheetPortal>
      ) : null}

      {step === "pin" ? (
        <TransferPinSheet
          error={pinError}
          pending={pending}
          pendingLabel="Deleting your account"
          onComplete={onPin}
          onRetry={() => setPinError(false)}
          onClose={() => setStep("form")}
        />
      ) : null}
    </div>
  );
}
