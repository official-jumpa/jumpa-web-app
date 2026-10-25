"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { AuthHeader } from "@/components/auth/auth-header";
import { AuthHeading, AuthScreen } from "@/components/auth/auth-screen";
import { PinDisplay } from "@/components/auth/pin-display";
import { KEYPAD_PANEL, NumericKeypad } from "@/components/auth/numeric-keypad";
import { SuccessSheet } from "@/components/auth/success-sheet";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { MailIcon } from "@/components/ui/icons/mail";
import { ArrowBackIcon } from "@/components/ui/icons/arrow-back";
import { usePinInput } from "@/hooks/use-pin-input";
import { useKeypadKeys } from "@/hooks/use-keypad-keys";
import { emailOtp } from "@/lib/auth-client";
import { normalizeEmail } from "@/lib/utils/email-policy";
import { isWeakPassword } from "@/lib/validations/user.validation";

type Step = "email" | "code" | "new-password" | "confirm-password" | "done";

const RESEND_COOLDOWN = 60;

function formatCountdown(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s < 10 ? "0" : ""}${s}s`;
}

interface ForgotPasswordViewProps {
  initialEmail?: string;
  isEmailLocked?: boolean;
}

export function ForgotPasswordView({
  initialEmail = "",
  isEmailLocked = false,
}: ForgotPasswordViewProps) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState(initialEmail);
  const [savedOtp, setSavedOtp] = useState("");
  const [savedNewPassword, setSavedNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [sendingCode, setSendingCode] = useState(false);
  const [checkingCode, setCheckingCode] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [countdown, setCountdown] = useState(RESEND_COOLDOWN);

  // Pin inputs
  const codePin = usePinInput(6);
  const newPasswordPin = usePinInput(6);
  const confirmPasswordPin = usePinInput(6);

  // Connect physical keyboard when relevant step is active
  useKeypadKeys({
    ...codePin,
    enabled: step === "code" && !checkingCode,
  });
  useKeypadKeys({
    ...newPasswordPin,
    enabled: step === "new-password",
  });
  useKeypadKeys({
    ...confirmPasswordPin,
    enabled: step === "confirm-password" && !submitting,
  });

  // Countdown timer for OTP resending
  useEffect(() => {
    if (step !== "code" || countdown <= 0) return;
    const interval = setInterval(() => {
      setCountdown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [step, countdown]);

  const clearError = useCallback(() => setError(null), []);

  // STEP 1: SEND OTP
  const handleSendOtp = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const cleanEmail = normalizeEmail(email);
    if (!cleanEmail || !cleanEmail.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    clearError();
    setSendingCode(true);

    try {
      const res = await emailOtp.sendVerificationOtp({
        email: cleanEmail,
        type: "email-verification",
      });

      if (res.error) {
        setError(res.error.message || "Failed to send verification code. Please try again.");
        return;
      }

      setCountdown(RESEND_COOLDOWN);
      codePin.clear();
      setStep("code");
    } catch (err: any) {
      setError(err?.message || "Failed to send verification code.");
    } finally {
      setSendingCode(false);
    }
  };

  // STEP 2: RESEND OTP
  const handleResendOtp = async () => {
    if (countdown > 0 || sendingCode) return;
    const cleanEmail = normalizeEmail(email);
    clearError();
    setSendingCode(true);

    try {
      const res = await emailOtp.sendVerificationOtp({
        email: cleanEmail,
        type: "email-verification",
      });

      if (res.error) {
        setError(res.error.message || "Failed to resend code.");
        return;
      }

      setCountdown(RESEND_COOLDOWN);
      codePin.clear();
      setError("A new verification code has been sent!");
    } catch {
      setError("Could not resend code. Please try again.");
    } finally {
      setSendingCode(false);
    }
  };

  // Refs to prevent infinite effect triggers when PIN is complete
  const attemptedOtpRef = useRef<string | null>(null);
  const attemptedNewPwdRef = useRef<string | null>(null);
  const attemptedConfirmPwdRef = useRef<string | null>(null);

  useEffect(() => {
    if (codePin.value.length < 6) {
      attemptedOtpRef.current = null;
    }
  }, [codePin.value]);

  useEffect(() => {
    if (newPasswordPin.value.length < 6) {
      attemptedNewPwdRef.current = null;
    }
  }, [newPasswordPin.value]);

  useEffect(() => {
    if (confirmPasswordPin.value.length < 6) {
      attemptedConfirmPwdRef.current = null;
    }
  }, [confirmPasswordPin.value]);

  // STEP 2: VERIFY OTP
  const handleVerifyOtp = useCallback(
    async (otpVal: string) => {
      clearError();
      setCheckingCode(true);

      try {
        const cleanEmail = normalizeEmail(email);
        const res = await fetch("/api/auth/email-otp/check-verification-otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: cleanEmail,
            type: "email-verification",
            otp: otpVal,
          }),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          codePin.clear();
          attemptedOtpRef.current = null;
          setError(data.error || data.message || "That code isn't right. Check the 6 digits and try again.");
          return;
        }

        setSavedOtp(otpVal);
        newPasswordPin.clear();
        attemptedNewPwdRef.current = null;
        setStep("new-password");
      } catch (err: any) {
        codePin.clear();
        attemptedOtpRef.current = null;
        setError(err?.message || "Failed to verify code. Please try again.");
      } finally {
        setCheckingCode(false);
      }
    },
    [clearError, email, codePin, newPasswordPin],
  );

  // Auto-verify OTP on 6th digit
  useEffect(() => {
    if (
      step === "code" &&
      codePin.complete &&
      !checkingCode &&
      attemptedOtpRef.current !== codePin.value
    ) {
      attemptedOtpRef.current = codePin.value;
      void handleVerifyOtp(codePin.value);
    }
  }, [step, codePin.complete, codePin.value, checkingCode, handleVerifyOtp]);

  // STEP 3: SUBMIT NEW PASSWORD
  const handleNewPasswordSubmit = useCallback(
    (pwd: string) => {
      clearError();
      if (isWeakPassword(pwd)) {
        newPasswordPin.clear();
        attemptedNewPwdRef.current = null;
        setError("Avoid sequences or repeated numbers (e.g. 123456, 111111). Choose a stronger password.");
        return;
      }

      setSavedNewPassword(pwd);
      confirmPasswordPin.clear();
      attemptedConfirmPwdRef.current = null;
      setStep("confirm-password");
    },
    [clearError, newPasswordPin, confirmPasswordPin],
  );

  useEffect(() => {
    if (
      step === "new-password" &&
      newPasswordPin.complete &&
      attemptedNewPwdRef.current !== newPasswordPin.value
    ) {
      attemptedNewPwdRef.current = newPasswordPin.value;
      handleNewPasswordSubmit(newPasswordPin.value);
    }
  }, [step, newPasswordPin.complete, newPasswordPin.value, handleNewPasswordSubmit]);

  // STEP 4: CONFIRM & COMPLETE RESET
  const handleConfirmPasswordSubmit = useCallback(
    async (confirmedPwd: string) => {
      if (confirmedPwd !== savedNewPassword) {
        confirmPasswordPin.clear();
        attemptedConfirmPwdRef.current = null;
        setError("Passwords do not match. Please re-enter.");
        return;
      }

      clearError();
      setSubmitting(true);

      try {
        const res = await fetch("/api/v1/auth/forgot-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: normalizeEmail(email),
            otp: savedOtp,
            newPassword: confirmedPwd,
          }),
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          if (data.error && /code|otp|expired/i.test(data.error)) {
            codePin.clear();
            attemptedOtpRef.current = null;
            setStep("code");
          } else {
            confirmPasswordPin.clear();
            attemptedConfirmPwdRef.current = null;
          }
          setError(data.error || "Failed to reset password. Please try again.");
          return;
        }

        setStep("done");
      } catch {
        confirmPasswordPin.clear();
        attemptedConfirmPwdRef.current = null;
        setError("Failed to connect to the server. Please try again.");
      } finally {
        setSubmitting(false);
      }
    },
    [clearError, savedNewPassword, email, savedOtp, codePin, confirmPasswordPin],
  );

  useEffect(() => {
    if (
      step === "confirm-password" &&
      confirmPasswordPin.complete &&
      !submitting &&
      attemptedConfirmPwdRef.current !== confirmPasswordPin.value
    ) {
      attemptedConfirmPwdRef.current = confirmPasswordPin.value;
      void handleConfirmPasswordSubmit(confirmPasswordPin.value);
    }
  }, [step, confirmPasswordPin.complete, confirmPasswordPin.value, submitting, handleConfirmPasswordSubmit]);

  // Back button handler
  const handleBack = () => {
    clearError();
    if (step === "email") {
      router.push("/home");
    } else if (step === "code") {
      setStep("email");
    } else if (step === "new-password") {
      codePin.clear();
      setStep("code");
    } else if (step === "confirm-password") {
      newPasswordPin.clear();
      setStep("new-password");
    }
  };

  return (
    <AuthScreen
      header={
        <header className="flex items-center justify-between">
          <button
            type="button"
            onClick={handleBack}
            className="flex size-10 items-center justify-center rounded-full border border-jumpa-neutral-100 bg-jumpa-white text-jumpa-black transition-colors hover:bg-jumpa-neutral-50"
            aria-label="Go back"
          >
            <ArrowBackIcon className="size-5" />
          </button>
          <Image
            src="/logo/wordmark/purple.png"
            alt="Jumpa"
            width={96}
            height={20}
            priority
            className="h-5 w-24"
          />
        </header>
      }
      className="[--auth-gap:20px] [--auth-pb:32px]"
    >
      {/* STEP 1: EMAIL ENTRY */}
      {step === "email" && (
        <div className="flex flex-col gap-6">
          <AuthHeading title="Reset Login Password">
            {isEmailLocked
              ? "We'll send a 6-digit verification code to your registered email address below to reset your login password."
              : "Enter your registered email address and we'll send you a 6-digit verification code to reset your login password."}
          </AuthHeading>

          <form onSubmit={handleSendOtp} className="flex flex-col gap-6">
            <TextField
              label="Registered Email"
              type="email"
              placeholder="name@example.com"
              value={email}
              readOnly={isEmailLocked}
              tabIndex={isEmailLocked ? -1 : undefined}
              aria-readonly={isEmailLocked}
              className={isEmailLocked ? "select-none" : undefined}
              onChange={(e) => {
                if (isEmailLocked) return;
                clearError();
                setEmail(e.target.value);
              }}
              icon={<MailIcon />}
              required
              autoFocus={!isEmailLocked}
            />

            {error && (
              <p className="text-xs font-semibold text-jumpa-danger animate-in shake">
                {error}
              </p>
            )}

            <Button
              type="submit"
              variant="gradient"
              size="lg"
              disabled={sendingCode || !email.trim()}
              className="w-full mt-2"
            >
              {sendingCode ? "Sending Code..." : "Send Verification Code"}
            </Button>
          </form>
        </div>
      )}

      {/* STEP 2: OTP VERIFICATION */}
      {step === "code" && (
        <div className="flex flex-col flex-1 justify-between gap-4">
          <div className="flex flex-col gap-5">
            <AuthHeading title="Check Your Email">
              We sent a 6-digit verification code to{" "}
              <span className="font-semibold text-jumpa-black">{email}</span>.
            </AuthHeading>

            <div className="flex flex-col items-center gap-4 mt-2">
              <PinDisplay
                length={6}
                value={codePin.value}
                reveal
                autoFocus
                disabled={checkingCode}
                onValueChange={(val) => {
                  clearError();
                  codePin.set(val);
                }}
              />

              {error ? (
                <p className="text-center text-xs font-semibold text-jumpa-danger animate-in shake">
                  {error}
                </p>
              ) : checkingCode ? (
                <p className="animate-pulse text-center text-xs text-jumpa-neutral-500">
                  Verifying code...
                </p>
              ) : null}

              <div className="flex items-center gap-2 text-xs">
                <span className="text-jumpa-neutral-500">Didn't receive code?</span>
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={countdown > 0 || sendingCode}
                  className="font-semibold text-jumpa-primary-600 disabled:text-jumpa-neutral-400 disabled:cursor-not-allowed hover:underline"
                >
                  {countdown > 0 ? `Resend in ${formatCountdown(countdown)}` : sendingCode ? "Sending..." : "Resend Code"}
                </button>
              </div>
            </div>
          </div>

          <div className="w-full max-w-sm mx-auto">
            <NumericKeypad
              onDigit={(d) => {
                clearError();
                codePin.push(d);
              }}
              onBackspace={() => {
                clearError();
                codePin.backspace();
              }}
              disabled={checkingCode}
              className={KEYPAD_PANEL}
            />
          </div>
        </div>
      )}

      {/* STEP 3: CREATE NEW PASSWORD */}
      {step === "new-password" && (
        <div className="flex flex-col flex-1 justify-between gap-4">
          <div className="flex flex-col gap-5">
            <AuthHeading title="Set New Password">
              Create a new 6-digit password. Avoid repeated or sequential digits.
            </AuthHeading>

            <div className="flex flex-col items-center gap-4 mt-2">
              <PinDisplay
                length={6}
                value={newPasswordPin.value}
                autoFocus
                onValueChange={(val) => {
                  clearError();
                  newPasswordPin.set(val);
                }}
              />

              {error && (
                <p className="text-center text-xs font-semibold text-jumpa-danger animate-in shake">
                  {error}
                </p>
              )}
            </div>
          </div>

          <div className="w-full max-w-sm mx-auto">
            <NumericKeypad
              onDigit={(d) => {
                clearError();
                newPasswordPin.push(d);
              }}
              onBackspace={() => {
                clearError();
                newPasswordPin.backspace();
              }}
              className={KEYPAD_PANEL}
            />
          </div>
        </div>
      )}

      {/* STEP 4: CONFIRM NEW PASSWORD */}
      {step === "confirm-password" && (
        <div className="flex flex-col flex-1 justify-between gap-4">
          <div className="flex flex-col gap-5">
            <AuthHeading title="Confirm New Password">
              Re-enter your 6-digit password to confirm.
            </AuthHeading>

            <div className="flex flex-col items-center gap-4 mt-2">
              <PinDisplay
                length={6}
                value={confirmPasswordPin.value}
                autoFocus
                disabled={submitting}
                onValueChange={(val) => {
                  clearError();
                  confirmPasswordPin.set(val);
                }}
              />

              {error ? (
                <p className="text-center text-xs font-semibold text-jumpa-danger animate-in shake">
                  {error}
                </p>
              ) : submitting ? (
                <p className="animate-pulse text-center text-xs text-jumpa-neutral-500">
                  Resetting password...
                </p>
              ) : null}
            </div>
          </div>

          <div className="w-full max-w-sm mx-auto">
            <NumericKeypad
              onDigit={(d) => {
                clearError();
                confirmPasswordPin.push(d);
              }}
              onBackspace={() => {
                clearError();
                confirmPasswordPin.backspace();
              }}
              disabled={submitting}
              className={KEYPAD_PANEL}
            />
          </div>
        </div>
      )}

      {/* STEP 5: SUCCESS SHEET */}
      {step === "done" && (
        <SuccessSheet
          title="Password Reset Successful"
          description="Your 6-digit login password has been updated. Please sign in to your Jumpa account to continue."
          actionHref="/sign-in"
          actionLabel="Sign In"
        />
      )}
    </AuthScreen>
  );
}
