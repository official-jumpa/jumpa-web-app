"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useAuthContext } from "@/components/auth/AuthGuard";
import { SuccessSheet } from "@/components/auth/success-sheet";
import { CodeStep } from "@/components/settings/pin-flow/code-step";
import {
  IDENTITY_COPY,
  IdentityStep,
} from "@/components/settings/pin-flow/identity-step";
import { PinStage } from "@/components/settings/pin-flow/pin-stage";
import { PinStep } from "@/components/settings/pin-flow/pin-step";
import { settingsHref } from "@/components/settings/sections";
import { Button } from "@/components/ui/button";
import { emailOtp } from "@/lib/auth-client";
import { normalizeEmail } from "@/lib/utils/email-policy";
import {
  PIN_FLOWS,
  type PinFlowName,
  RESET_CODE_LENGTH,
} from "@/lib/pin-flows";

/**
 * `change` runs current -> create -> confirm; `forgot` swaps the first step for
 * intro -> identity -> code. Both end on the same success sheet.
 */
type Stage =
  | "not-supported"
  | "identity"
  | "code"
  | "current"
  | "create"
  | "confirm"
  | "done";

/** The step behind each one, so the header can walk back without history. */
const PREVIOUS: Partial<Record<Stage, Stage>> = {
  code: "identity",
  confirm: "create",
};

const BACK = settingsHref("security");

/**
 * Every PIN screen under Settings: changing the login or transaction PIN, and
 * resetting either after a reset code. The steps share one URL, so the header
 * steps back through `PREVIOUS` and leaving the first step exits to Security.
 */
export function PinFlow({ name }: { name: PinFlowName }) {
  const flow = PIN_FLOWS[name];
  const router = useRouter();
  const auth = useAuthContext();
  const userEmail = auth?.user?.email || "";

  const [stage, setStage] = useState<Stage>(
    flow.mode === "forgot" ? "identity" : "current",
  );
  const [contact, setContact] = useState(userEmail);
  const [currentPin, setCurrentPin] = useState("");
  const [verifiedOtp, setVerifiedOtp] = useState("");
  const [created, setCreated] = useState("");
  const [busy, setBusy] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [checkingCode, setCheckingCode] = useState(false);
  const [isV3, setIsV3] = useState<boolean | null>(null);
  const [error, setError] = useState<string>();

  // Check if wallet is v3 on mount for forgot flows
  useEffect(() => {
    if (flow.mode !== "forgot" || flow.kind !== "transaction") return;

    let active = true;
    fetch("/api/auth/wallet-setup")
      .then((res) => res.json())
      .then((data) => {
        if (!active) return;
        const v3 = Boolean(data.isV3Wallet);
        setIsV3(v3);
        if (!v3) {
          setStage("not-supported");
        }
      })
      .catch(() => {
        if (!active) return;
        // Fallback default to true, server route /api/v1/wallet/pin?action=update enforces strictly
        setIsV3(true);
      });

    return () => {
      active = false;
    };
  }, [flow.mode, flow.kind]);

  // Keep contact in sync with user email if initially empty
  useEffect(() => {
    if (userEmail && !contact) {
      setContact(userEmail);
    }
  }, [userEmail, contact]);

  const clearError = useCallback(() => setError(undefined), []);

  const goBack = () => {
    const previous = PREVIOUS[stage];
    clearError();
    if (previous) setStage(previous);
    else router.push(BACK);
  };

  const step = useCallback(
    (next: Stage) => {
      clearError();
      setStage(next);
    },
    [clearError],
  );

  const checkCurrent = useCallback(
    async (pin: string) => {
      clearError();
      setBusy(true);
      try {
        if (flow.kind === "login") {
          const res = await fetch("/api/auth/verify-password", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ password: pin }),
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) {
            setError(data.error || "Incorrect current login PIN");
            return;
          }
        } else {
          const res = await fetch("/api/v1/wallet/pin?action=verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pin }),
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok || data.success === false) {
            setError(data.error || "Incorrect transaction PIN");
            return;
          }
        }

        setCurrentPin(pin);
        step("create");
      } catch {
        setError("Failed to verify current PIN. Please check your connection.");
      } finally {
        setBusy(false);
      }
    },
    [clearError, flow.kind, step],
  );

  const handleSendOtp = useCallback(
    async (emailToVerify: string) => {
      clearError();
      setSendingCode(true);
      const target = normalizeEmail(emailToVerify);
      try {
        const res = await emailOtp.sendVerificationOtp({
          email: target,
          type: "email-verification",
        });

        if (res.error) {
          setError(res.error.message || "Failed to send verification code");
          return;
        }

        setContact(target);
        step("code");
      } catch (err: any) {
        setError(err?.message || "Failed to send verification code. Try again.");
      } finally {
        setSendingCode(false);
      }
    },
    [clearError, step],
  );

  const handleVerifyOtp = useCallback(
    async (otpCode: string) => {
      clearError();
      setCheckingCode(true);
      try {
        const target = normalizeEmail(contact || userEmail);
        const res = await fetch("/api/auth/email-otp/check-verification-otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: target,
            type: "email-verification",
            otp: otpCode,
          }),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(data.error || data.message || "Invalid or expired verification code");
          return;
        }

        setVerifiedOtp(otpCode);
        step("create");
      } catch (err: any) {
        setError(err?.message || "Failed to verify code. Try again.");
      } finally {
        setCheckingCode(false);
      }
    },
    [clearError, contact, userEmail, step],
  );

  const confirmCreated = useCallback(
    async (pin: string) => {
      if (pin !== created) {
        setError("PINs do not match. Enter the new PIN again.");
        return;
      }
      setBusy(true);
      try {
        const res = await fetch("/api/v1/wallet/pin?action=update", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            currentPin: currentPin || undefined,
            newPin: pin,
            otp: verifiedOtp || undefined,
            kind: flow.kind,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          // If code was expired/invalid, let user return to code step
          if (data.error && /code|otp|expired/i.test(data.error)) {
            step("code");
          }
          setError(data.error || "Failed to update PIN");
          return;
        }
        step("done");
      } catch {
        setError("Failed to connect to server. Try again.");
      } finally {
        setBusy(false);
      }
    },
    [created, currentPin, flow.kind, verifiedOtp, step],
  );

  const title = flow.title;

  if (stage === "not-supported") {
    return (
      <PinStage
        title={title}
        heading="Wallet Cannot Be Recovered"
        description="Your wallet cannot be recovered this way. Please contact support for further assistance"
        onBack={goBack}
        footer={
          <Button variant="brand" size="lg" onClick={() => router.push(BACK)}>
            Back to Security
          </Button>
        }
      />
    );
  }

  if (stage === "identity") {
    return (
      <PinStage
        title={title}
        heading={IDENTITY_COPY.heading}
        description={IDENTITY_COPY.description}
        onBack={goBack}
      >
        <IdentityStep
          value={contact || userEmail}
          sending={sendingCode}
          onSend={handleSendOtp}
        />
      </PinStage>
    );
  }

  if (stage === "code") {
    return (
      <PinStage
        title={title}
        heading="Enter Verification Code"
        description={`A ${RESET_CODE_LENGTH}-digit code has been sent to ${contact}`}
        onBack={goBack}
      >
        <CodeStep
          contact={contact}
          error={error}
          checking={checkingCode}
          onEdit={clearError}
          onResend={() => handleSendOtp(contact)}
          onSubmit={handleVerifyOtp}
        />
      </PinStage>
    );
  }

  if (stage === "current" && flow.current) {
    return (
      <PinStage
        title={title}
        heading={flow.current.heading}
        description={flow.current.description}
        onBack={goBack}
      >
        <PinStep
          key="current"
          label={flow.current.label}
          length={flow.length}
          note={flow.note}
          error={error}
          busy={busy}
          onEdit={clearError}
          onSubmit={checkCurrent}
        />
      </PinStage>
    );
  }

  if (stage === "create") {
    return (
      <PinStage
        title={title}
        heading={flow.create.heading}
        description={flow.create.description}
        onBack={goBack}
      >
        <PinStep
          key="create"
          label={flow.create.label}
          length={flow.length}
          note={flow.note}
          onSubmit={(pin) => {
            setCreated(pin);
            step("confirm");
          }}
        />
      </PinStage>
    );
  }

  if (stage === "confirm") {
    return (
      <PinStage
        title={title}
        heading={flow.confirm.heading}
        description={flow.confirm.description}
        onBack={goBack}
      >
        <PinStep
          key="confirm"
          label={flow.confirm.label}
          length={flow.length}
          note={flow.note}
          error={error}
          busy={busy}
          onEdit={clearError}
          onSubmit={confirmCreated}
        />
      </PinStage>
    );
  }

  return (
    <>
      <PinStage
        title={title}
        heading={flow.confirm.heading}
        description={flow.confirm.description}
        onBack={goBack}
      />
      <SuccessSheet
        title={flow.success.title}
        description={flow.success.description}
        actionHref={BACK}
        actionLabel="Done"
      />
    </>
  );
}
