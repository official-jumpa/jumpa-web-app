"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { CopyButton } from "@/components/auth/copy-button";
import { InfoNote } from "@/components/auth/info-note";
import { DetailList, DetailRow } from "@/components/transfer/detail-list";
import { TransferSuccess } from "@/components/transfer/transfer-success";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
import { BankIcon } from "@/components/ui/icons/bank";
import { NairaSignIcon } from "@/components/ui/icons/naira-sign";
import { JumpaLoader } from "@/components/ui/jumpa-loader";
import { ScreenHeader } from "@/components/ui/screen-header";
import { cn } from "@/lib/cn";

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

/** How long a fresh account lives — the ring reads its progress off this. */
const DEPOSIT_WINDOW_SECS = 1800;
/** Under this the countdown turns red. */
const URGENT_SECS = 300;

const RING_RADIUS = 15;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

const HERO =
  "relative isolate flex flex-col gap-3 overflow-hidden rounded-key bg-[image:var(--gradient-jumpa-hero)] px-5 py-4.5";
const HERO_LABEL =
  "flex items-center gap-1.5 self-start rounded-pill bg-jumpa-white px-2.5 py-1.5 text-[10px] leading-3 font-bold tracking-jumpa-wide text-jumpa-primary-950 uppercase";
const AMOUNT_TEXT = "text-3xl leading-8 font-semibold text-jumpa-white";
const CARD =
  "flex flex-col gap-3 rounded-surface border border-jumpa-neutral-60 bg-jumpa-neutral-50 px-4 py-4";

function formatSeconds(secs: number): string {
  if (secs <= 0) return "00:00";
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function formatNaira(value: number): string {
  return `₦${value.toLocaleString()}`;
}

/** The brand grid that sits behind every gradient card in the app. */
function HeroGrid() {
  return (
    <Image
      src="/images/home/hero-grid.svg"
      alt=""
      aria-hidden="true"
      width={287}
      height={264}
      className="pointer-events-none absolute -top-10 left-1/2 -z-10 max-w-none -translate-x-1/2 opacity-70"
    />
  );
}

/** Time left on the account, as a ring that drains rather than a bare clock. */
function Countdown({ secs }: { secs: number }) {
  const progress = Math.max(0, Math.min(1, secs / DEPOSIT_WINDOW_SECS));
  const urgent = secs <= URGENT_SECS;

  return (
    <span
      className={cn(
        "shrink-0",
        urgent ? "text-jumpa-danger" : "text-jumpa-primary-600",
      )}
    >
      <svg viewBox="0 0 36 36" aria-hidden="true" className="size-9 -rotate-90">
        <circle
          cx="18"
          cy="18"
          r={RING_RADIUS}
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          className="opacity-20"
        />
        <circle
          cx="18"
          cy="18"
          r={RING_RADIUS}
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={RING_LENGTH}
          strokeDashoffset={RING_LENGTH * (1 - progress)}
        />
      </svg>
    </span>
  );
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
      } catch {
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
    if (Number.isNaN(cleanAmount) || cleanAmount <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    if (cleanAmount < MIN_DEPOSIT) {
      setError(`Minimum deposit amount is ${formatNaira(MIN_DEPOSIT)}`);
      return;
    }

    if (cleanAmount > MAX_DEPOSIT) {
      setError(`Maximum single deposit is ${formatNaira(MAX_DEPOSIT)}`);
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
        setError(
          data.error || "Failed to create deposit session. Please try again.",
        );
        setSubmitting(false);
        return;
      }

      if (data.session) {
        setSession(data.session);
        const expTime = new Date(data.session.expiresAt).getTime();
        const secsLeft = Math.max(0, Math.floor((expTime - Date.now()) / 1000));
        setRemainingSecs(secsLeft > 0 ? secsLeft : DEPOSIT_WINDOW_SECS);
        setStage("transfer");
      }
    } catch (err: any) {
      setError(
        err.message ||
          "A network error occurred. Please check your connection.",
      );
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
          data.message ||
            "Payment not yet detected by bank. Please ensure transfer is complete.",
        );
      }
    } catch {
      setVerifyMessage(
        "Could not verify status. We will keep checking automatically.",
      );
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
        <p className="mt-3 text-xs leading-4 font-medium text-jumpa-neutral-400">
          Loading deposit session…
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
        amount={`+${formatNaira(session.amount)}`}
        titleFirst
        ctaLabel="View Balance"
        ctaHref="/ngn-account?view=details"
        details={
          <DetailList tone="secondary">
            <DetailRow
              label="Amount Credited"
              value={`${formatNaira(session.amount)} NGN`}
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
          <span className="flex size-16 items-center justify-center rounded-full bg-jumpa-danger-100 text-jumpa-danger">
            <BankIcon className="size-7" />
          </span>
          <h2 className="mt-4 text-base leading-5 font-bold text-jumpa-black">
            Session expired
          </h2>
          <p className="mt-2 max-w-xs text-sm leading-4.5 font-medium text-jumpa-neutral-300">
            That account has timed out. Start again and we'll issue you a fresh
            one.
          </p>
          <Button
            variant="gradient"
            size="lg"
            onClick={handleCancelSession}
            disabled={submitting}
            className="mt-6 w-full max-w-xs"
          >
            Start new deposit
          </Button>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // Stage: Transfer / Bank Details
  // ----------------------------------------------------
  if (stage === "transfer" && session) {
    const urgent = remainingSecs <= URGENT_SECS;

    return (
      <div className="flex min-h-dvh flex-col px-4.5 pt-[calc(env(safe-area-inset-top)+1.5rem)] pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
        <ScreenHeader
          back="/receive"
          onBack={handleCancelSession}
          title="Deposit Naira"
          round
        />

        <div className="mt-4 flex flex-1 flex-col gap-4">
          <div className="flex items-center gap-3 rounded-surface bg-jumpa-primary-50 px-4 py-3">
            <Countdown secs={remainingSecs} />
            <span className="flex min-w-0 flex-col gap-0.5">
              <span
                className={cn(
                  "text-sm leading-4 font-semibold",
                  urgent ? "text-jumpa-danger" : "text-jumpa-black",
                )}
              >
                Transfer within {formatSeconds(remainingSecs)}
              </span>
              <span className="text-[10px] leading-3 font-medium text-jumpa-neutral-400">
                This account closes when the timer runs out.
              </span>
            </span>
          </div>

          <section className={HERO}>
            <HeroGrid />

            <span className={HERO_LABEL}>
              <span className="flex size-4 items-center justify-center rounded-full bg-jumpa-primary-950 text-jumpa-white">
                <NairaSignIcon className="size-2.5" />
              </span>
              Send exactly
            </span>

            <span className="flex items-center justify-between gap-3">
              <span className={AMOUNT_TEXT}>{formatNaira(session.amount)}</span>
              {/* The pill, not the chip: the chip's purple is invisible here. */}
              <CopyButton
                value={String(session.amount)}
                name="Copy deposit amount"
                label="Copy"
              />
            </span>

            <span className="text-[10px] leading-3 font-medium text-jumpa-white/70">
              A different amount will not be matched to this account.
            </span>
          </section>

          <DetailList>
            <DetailRow label="Bank name" value={session.bankName} />
            <DetailRow
              label="Account number"
              value={
                <span className="flex items-center gap-2">
                  {session.accountNumber}
                  <CopyButton
                    value={session.accountNumber}
                    name="Copy account number"
                    variant="chip"
                    label="Copy"
                  />
                </span>
              }
            />
            <DetailRow
              label="Account name"
              value={session.accountName}
              truncate={false}
              rule={false}
            />
          </DetailList>

          {verifyMessage ? (
            <InfoNote tone="brand">{verifyMessage}</InfoNote>
          ) : (
            <InfoNote tone="warning">
              Your naira balance updates automatically once the bank confirms
              the transfer.
            </InfoNote>
          )}

          <div className="mt-auto flex flex-col gap-3 pt-4">
            <Button
              variant="gradient"
              size="lg"
              onClick={handleManualVerify}
              disabled={verifying}
            >
              {verifying ? "Checking status…" : "I have made the transfer"}
            </Button>

            <button
              type="button"
              onClick={handleCancelSession}
              disabled={submitting}
              className="tap py-2 text-center text-xs leading-4 font-semibold text-jumpa-neutral-400 active:scale-95"
            >
              Change amount
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

      <form
        onSubmit={handleInitiateDeposit}
        className="mt-4 flex flex-1 flex-col gap-5"
      >
        <p className="text-xs leading-4.5 font-medium text-jumpa-neutral-400">
          Tell us how much you're sending and we'll issue a one-time account to
          transfer it to.
        </p>

        <label className={HERO}>
          <HeroGrid />

          <span className={HERO_LABEL}>
            <span className="flex size-4 items-center justify-center rounded-full bg-jumpa-primary-950 text-jumpa-white">
              <NairaSignIcon className="size-2.5" />
            </span>
            Amount to deposit
          </span>

          <span className="flex items-baseline gap-1">
            <span className={AMOUNT_TEXT}>₦</span>
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
              aria-invalid={Boolean(error)}
              className={cn(
                AMOUNT_TEXT,
                "min-w-0 flex-1 bg-transparent caret-jumpa-alt-400 outline-none placeholder:text-jumpa-white/40",
              )}
              autoFocus
            />
          </span>

          <span className="text-[10px] leading-3 font-medium text-jumpa-white/70">
            Min {formatNaira(MIN_DEPOSIT)} · Max {formatNaira(MAX_DEPOSIT)}
          </span>
        </label>

        <FieldError>{error ?? undefined}</FieldError>

        <div className="flex flex-wrap gap-2">
          {PRESETS.map((preset) => {
            const picked = amount === preset.toLocaleString();
            return (
              <button
                key={preset}
                type="button"
                aria-pressed={picked}
                onClick={() => {
                  setError(null);
                  setAmount(preset.toLocaleString());
                }}
                className={cn(
                  "tap h-9 rounded-pill px-4 text-xs leading-4 font-medium active:scale-95",
                  picked
                    ? "bg-jumpa-primary-600 text-jumpa-white"
                    : "bg-jumpa-primary-50 text-jumpa-primary-950",
                )}
              >
                {formatNaira(preset)}
              </button>
            );
          })}
        </div>

        <div className={CARD}>
          <p className="flex items-center justify-between gap-3 text-xs leading-4 font-medium text-jumpa-black">
            <span className="text-jumpa-neutral-400">Deposit fee</span>
            <span className="text-jumpa-success">Free</span>
          </p>
          <span className="-mb-px block h-px w-full bg-jumpa-neutral-95" />
          <p className="flex items-center justify-between gap-3 text-xs leading-4 font-medium text-jumpa-black">
            <span className="text-jumpa-neutral-400">Funding method</span>
            <span>Nigerian bank transfer</span>
          </p>
          <span className="-mb-px block h-px w-full bg-jumpa-neutral-95" />
          <p className="flex items-center justify-between gap-3 text-xs leading-4 font-medium text-jumpa-black">
            <span className="text-jumpa-neutral-400">Arrives in</span>
            <span>Seconds</span>
          </p>
        </div>

        <Button
          variant="gradient"
          size="lg"
          type="submit"
          disabled={submitting || !amount}
          className="mt-auto"
        >
          {submitting ? "Generating details…" : "Continue to transfer"}
        </Button>
      </form>
    </div>
  );
}
