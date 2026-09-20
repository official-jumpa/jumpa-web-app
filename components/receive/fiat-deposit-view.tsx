"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ScreenHeader } from "@/components/ui/screen-header";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/auth/copy-button";
import { FieldError } from "@/components/ui/field-error";
import { JumpaLoader } from "@/components/ui/jumpa-loader";
import { TransferSuccess } from "@/components/transfer/transfer-success";
import { DetailList, DetailRow } from "@/components/transfer/detail-list";
import { NairaSignIcon } from "@/components/ui/icons/naira-sign";
import { BankIcon } from "@/components/ui/icons/bank";

interface DepositSession {
  sessionId: string;
  accountNumber: string;
  accountName: string;
  bankName: string;
  amount: number;
  currency: string;
  expiresAt: string;
  status: string;
}

type Stage = "loading" | "amount" | "transfer" | "success" | "expired";

const PRESETS = [1000, 5000, 10000, 20000];
const MIN_DEPOSIT = 200;
const MAX_DEPOSIT = 1000000;

function formatSeconds(secs: number): string {
  if (secs <= 0) return "00:00";
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function FiatDepositView() {
  const [stage, setStage] = useState<Stage>("loading");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<DepositSession | null>(null);
  const [remainingSecs, setRemainingSecs] = useState<number>(0);

  const [submitting, setSubmitting] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verifyMessage, setVerifyMessage] = useState<string | null>(null);

  // 1. On Mount: Check if user already has an active, unexpired session
  useEffect(() => {
    let isMounted = true;

    async function checkActiveSession() {
      try {
        const res = await fetch("/api/ngn-account/deposit");
        if (res.ok && isMounted) {
          const data = await res.json();
          if (data.hasActiveSession && data.session) {
            const expTime = new Date(data.session.expiresAt).getTime();
            const secsLeft = Math.floor((expTime - Date.now()) / 1000);

            if (secsLeft > 0) {
              setSession(data.session);
              setRemainingSecs(secsLeft);
              setStage("transfer");
              return;
            }
          }
        }
      } catch (err) {
        console.warn("Could not check active session:", err);
      } finally {
        if (isMounted) setStage("amount");
      }
    }

    checkActiveSession();

    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Countdown Timer
  useEffect(() => {
    if (stage !== "transfer" || remainingSecs <= 0) return;

    const timer = setInterval(() => {
      setRemainingSecs((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setStage("expired");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [stage, remainingSecs]);

  // 3. Background Polling for Transfer Verification (every 6 seconds while in transfer stage)
  useEffect(() => {
    if (stage !== "transfer" || !session) return;

    const poller = setInterval(async () => {
      try {
        const res = await fetch("/api/ngn-account/verify-deposit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: session.sessionId }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.confirmed) {
            setStage("success");
          }
        }
      } catch (err) {
        // Silent polling background error
      }
    }, 6000);

    return () => clearInterval(poller);
  }, [stage, session]);

  // Handle Amount Submission to Generate / Retrieve DVA
  const handleInitiateDeposit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);

    const cleanAmount = Number(amount.replace(/[^0-9.]/g, ""));
    if (isNaN(cleanAmount) || cleanAmount <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    if (cleanAmount < MIN_DEPOSIT) {
      setError(`Minimum deposit amount is ₦${MIN_DEPOSIT.toLocaleString()}`);
      return;
    }

    if (cleanAmount > MAX_DEPOSIT) {
      setError(`Maximum single deposit is ₦${MAX_DEPOSIT.toLocaleString()}`);
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/ngn-account/deposit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: cleanAmount }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create deposit session. Please try again.");
        setSubmitting(false);
        return;
      }

      if (data.session) {
        setSession(data.session);
        const expTime = new Date(data.session.expiresAt).getTime();
        const secsLeft = Math.max(0, Math.floor((expTime - Date.now()) / 1000));
        setRemainingSecs(secsLeft > 0 ? secsLeft : 1800);
        setStage("transfer");
      }
    } catch (err: any) {
      setError(err.message || "A network error occurred. Please check your connection.");
    } finally {
      setSubmitting(false);
    }
  };

  // Manual Verification Check ("I Have Transferred")
  const handleManualVerify = async () => {
    if (!session || verifying) return;
    setVerifying(true);
    setVerifyMessage(null);

    try {
      const res = await fetch("/api/ngn-account/verify-deposit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: session.sessionId }),
      });

      const data = await res.json();

      if (data.confirmed) {
        setStage("success");
      } else {
        setVerifyMessage(
          data.message || "Payment not yet detected by bank. Please ensure transfer is complete."
        );
      }
    } catch (err: any) {
      setVerifyMessage("Could not verify status. We will keep checking automatically.");
    } finally {
      setVerifying(false);
    }
  };

  // Cancel / Reset Active Session to Enter New Amount
  const handleCancelSession = async () => {
    setSubmitting(true);
    try {
      await fetch("/api/ngn-account/deposit", { method: "DELETE" });
    } catch {}
    setSession(null);
    setRemainingSecs(0);
    setVerifyMessage(null);
    setError(null);
    setSubmitting(false);
    setStage("amount");
  };

  // ----------------------------------------------------
  // Stage: Loading
  // ----------------------------------------------------
  if (stage === "loading") {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center px-4.5 pt-[calc(env(safe-area-inset-top)+1.5rem)] pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
        <JumpaLoader />
        <p className="mt-3 text-xs font-medium text-jumpa-neutral-500">
          Loading deposit session...
        </p>
      </div>
    );
  }

  // ----------------------------------------------------
  // Stage: Success
  // ----------------------------------------------------
  if (stage === "success" && session) {
    return (
      <TransferSuccess
        back="/ngn-account?view=details"
        title="Deposit Successful"
        amount={`+₦${session.amount.toLocaleString()}`}
        titleFirst
        ctaLabel="View Balance"
        ctaHref="/ngn-account?view=details"
        details={
          <DetailList tone="secondary">
            <DetailRow
              label="Amount Credited"
              value={`₦${session.amount.toLocaleString()} NGN`}
            />
            <DetailRow label="Bank" value={session.bankName} />
            <DetailRow label="Account Number" value={session.accountNumber} />
            <DetailRow
              label="Account Name"
              value={session.accountName}
              truncate={false}
            />
            <DetailRow
              label="Reference"
              value={session.sessionId}
              truncate={false}
              rule={false}
            />
          </DetailList>
        }
      />
    );
  }

  // ----------------------------------------------------
  // Stage: Expired Session
  // ----------------------------------------------------
  if (stage === "expired") {
    return (
      <div className="flex min-h-dvh flex-col px-4.5 pt-[calc(env(safe-area-inset-top)+1.5rem)] pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
        <ScreenHeader back="/receive" title="Deposit Naira" round />
        <div className="my-auto flex flex-col items-center text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-jumpa-danger/10 text-jumpa-danger">
            <BankIcon className="size-7" />
          </div>
          <h2 className="mt-4 text-xl font-semibold text-jumpa-black">
            Session Expired
          </h2>
          <p className="mt-2 max-w-xs text-sm text-jumpa-neutral-500">
            This deposit session has timed out. Any transfers must be made to a fresh dynamic account.
          </p>
          <div className="mt-6 w-full max-w-xs">
            <Button
              variant="gradient"
              size="lg"
              onClick={handleCancelSession}
              disabled={submitting}
              className="w-full"
            >
              Start New Deposit
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // Stage: Transfer / Bank Details
  // ----------------------------------------------------
  if (stage === "transfer" && session) {
    return (
      <div className="flex min-h-dvh flex-col px-4.5 pt-[calc(env(safe-area-inset-top)+1.5rem)] pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
        <ScreenHeader
          back="/receive"
          onBack={handleCancelSession}
          title="Deposit Naira"
          round
        />

        <div className="mt-4 flex flex-col gap-6">
          {/* Header instructions */}
          <div>
            <h1 className="text-[26px] leading-8 font-semibold text-jumpa-black">
              Transfer to Account
            </h1>
            <p className="mt-1.5 text-xs leading-4.5 text-jumpa-neutral-500">
              Transfer the exact amount to this temporary bank account. Your Naira balance will be updated automatically.
            </p>
          </div>

          {/* DVA Bank Details Card */}
          <div className="flex flex-col gap-4.5 rounded-3xl border border-jumpa-neutral-100 bg-jumpa-neutral-50 p-5 shadow-sm">
            {/* Amount & Timer */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold tracking-wide text-jumpa-neutral-500 uppercase">
                Exact Amount
              </span>
              <span className="flex items-center gap-1 rounded-pill bg-jumpa-primary-100 px-2.5 py-1 text-xs font-bold text-jumpa-primary-900">
                <span>⏱</span>
                <span>{formatSeconds(remainingSecs)}</span>
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold tracking-tight text-jumpa-black">
                ₦{session.amount.toLocaleString()}
              </span>
              <CopyButton
                value={String(session.amount)}
                name="Copy deposit amount"
                variant="pill"
              />
            </div>

            <div className="h-px bg-jumpa-neutral-200" />

            {/* Bank details rows */}
            <div className="flex flex-col gap-3.5 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs text-jumpa-neutral-500">Bank Name</span>
                <span className="font-semibold text-jumpa-black">
                  {session.bankName}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-jumpa-neutral-500">Account Number</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-base font-bold text-jumpa-primary-950 tracking-wider">
                    {session.accountNumber}
                  </span>
                  <CopyButton
                    value={session.accountNumber}
                    name="Copy account number"
                    variant="pill"
                  />
                </div>
              </div>

              <div className="flex items-start justify-between gap-4">
                <span className="shrink-0 text-xs text-jumpa-neutral-500">Account Name</span>
                <span className="text-right font-semibold text-jumpa-black break-words">
                  {session.accountName}
                </span>
              </div>
            </div>
          </div>

          {/* Verification feedback message if manual check was clicked */}
          {verifyMessage ? (
            <div className="rounded-2xl border border-jumpa-primary-100 bg-jumpa-primary-50 p-3.5 text-xs text-jumpa-primary-950">
              {verifyMessage}
            </div>
          ) : null}

          {/* Transfer Notice */}
          <div className="rounded-2xl border border-jumpa-neutral-200/70 bg-jumpa-neutral-50/50 p-4 text-xs text-jumpa-neutral-600 leading-relaxed">
            <p className="font-semibold text-jumpa-black mb-1">Important Notice</p>
            <p>
              This dynamic account expires in {formatSeconds(remainingSecs)}. Please ensure you transfer the exact amount of{" "}
              <b className="text-jumpa-black">₦{session.amount.toLocaleString()}</b>.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="mt-auto flex flex-col gap-3 pt-4">
            <Button
              variant="gradient"
              size="lg"
              onClick={handleManualVerify}
              disabled={verifying}
              className="w-full"
            >
              {verifying ? "Checking Status..." : "I Have Made the Transfer"}
            </Button>

            <button
              type="button"
              onClick={handleCancelSession}
              disabled={submitting}
              className="tap py-2 text-center text-xs font-semibold text-jumpa-neutral-500 hover:text-jumpa-black active:scale-95"
            >
              Change Amount / Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // Stage: Amount Input (Default)
  // ----------------------------------------------------
  return (
    <div className="flex min-h-dvh flex-col px-4.5 pt-[calc(env(safe-area-inset-top)+1.5rem)] pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
      <ScreenHeader back="/receive" title="Deposit Naira" round />

      <form onSubmit={handleInitiateDeposit} className="mt-4 flex flex-1 flex-col gap-6">
        <div>
          <p className="mt-2 text-xs leading-4.5 text-jumpa-neutral-500">
            Enter the amount you want to deposit into your Naira account.
          </p>
        </div>

        {error ? (
          <div className="rounded-2xl border border-jumpa-danger/20 bg-jumpa-danger/10 p-4 text-xs font-medium text-jumpa-danger">
            {error}
          </div>
        ) : null}

        {/* Amount Input Box */}
        <div className="flex flex-col gap-2 rounded-3xl border border-jumpa-neutral-100 bg-jumpa-neutral-50 p-5">
          <span className="text-xs font-semibold uppercase text-jumpa-neutral-500">
            Amount (NGN)
          </span>

          <div className="flex items-center gap-2">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-jumpa-primary-100 text-jumpa-primary-800 font-bold">
              ₦
            </span>
            <input
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(e) => {
                setError(null);
                const raw = e.target.value.replace(/[^0-9]/g, "");
                setAmount(raw ? Number(raw).toLocaleString() : "");
              }}
              placeholder="0"
              className="w-full bg-transparent text-3xl font-bold tracking-tight text-jumpa-black outline-none placeholder:text-jumpa-neutral-300"
              autoFocus
            />
          </div>

          <span className="text-[11px] text-jumpa-neutral-400">
            Min ₦{MIN_DEPOSIT.toLocaleString()} • Max ₦{MAX_DEPOSIT.toLocaleString()}
          </span>
        </div>

        {/* Quick Amount Preset Chips */}
        <div>
          <span className="text-xs font-semibold uppercase text-jumpa-neutral-500">
            Quick Options
          </span>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => {
                  setError(null);
                  setAmount(preset.toLocaleString());
                }}
                className="tap rounded-pill border border-jumpa-neutral-200 bg-jumpa-white px-3.5 py-1.5 text-xs font-medium text-jumpa-black transition hover:border-jumpa-primary-500 hover:bg-jumpa-primary-50 active:scale-95"
              >
                ₦{preset.toLocaleString()}
              </button>
            ))}
          </div>
        </div>

        {/* Transparent details summary */}
        <div className="rounded-2xl border border-jumpa-primary-100 bg-jumpa-primary-50/50 p-4 text-xs text-jumpa-primary-950">
          <div className="flex items-center justify-between">
            <span>Deposit Fee</span>
            <span className="font-semibold text-jumpa-primary-700">Free (₦0.00)</span>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span>Funding Method</span>
            <span className="font-semibold">Nigerian Bank Transfer</span>
          </div>
        </div>

        {/* Submit CTA */}
        <div className="mt-auto pt-4 pb-2">
          <Button
            variant="gradient"
            size="lg"
            type="submit"
            disabled={submitting || !amount}
            className="w-full"
          >
            {submitting ? "Generating Details..." : "Continue to Transfer"}
          </Button>
        </div>
      </form>
    </div>
  );
}
