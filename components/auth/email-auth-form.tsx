"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
import { MailIcon } from "@/components/ui/icons/mail";
import { UsersIcon } from "@/components/ui/icons/users";
import { LockIcon } from "@/components/ui/icons/lock";
import { TextField } from "@/components/ui/text-field";
import { emailOtp } from "@/lib/auth-client";
import {
  writeSignUpEmail,
  writeSignUpReferral,
  readSignUpReferral,
} from "@/lib/sign-up";
import {
  normalizeEmail,
  hasPlusAlias,
  isEmailBlacklisted,
} from "@/lib/utils/email-policy";

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function EmailAuthForm({
  nextHref = "/sign-up/verify-code",
  showReferralField = false,
}: {
  nextHref?: string;
  showReferralField?: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [isFromUrl, setIsFromUrl] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 1. Check URL search param first (?ref=...)
    const urlRef = searchParams?.get("ref")?.trim();
    if (urlRef) {
      const clean = urlRef.toUpperCase();
      setReferralCode(clean);
      setIsFromUrl(true);
      writeSignUpReferral(clean);
      return;
    }

    // 2. Check stored signup referral or cookie
    const storedRef = readSignUpReferral();
    if (storedRef) {
      setReferralCode(storedRef);
      setIsFromUrl(false);
      return;
    }

    // 3. Fallback: inspect document.cookie for jumpa_ref
    if (typeof document !== "undefined") {
      const match = document.cookie.match(/(?:^|;\s*)jumpa_ref=([^;]+)/);
      if (match?.[1]) {
        try {
          const cookieVal = decodeURIComponent(match[1]).trim().toUpperCase();
          if (cookieVal) {
            setReferralCode(cookieVal);
            setIsFromUrl(true);
            writeSignUpReferral(cookieVal);
          }
        } catch {
          // ignore cookie decode error
        }
      }
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!isValidEmail(trimmed)) {
      setError("Please enter a valid email address");
      return;
    }

    if (hasPlusAlias(trimmed)) {
      setError("Email aliases are not allowed");
      return;
    }

    if (isEmailBlacklisted(trimmed)) {
      setError("This account has been suspended");
      return;
    }

    const cleanEmail = normalizeEmail(trimmed);

    // Save referral code if user provided one or if populated from URL
    const cleanRef = referralCode.trim().toUpperCase();
    if (cleanRef) {
      writeSignUpReferral(cleanRef);
      // Also ensure cookie is set so server auth hooks receive it
      if (typeof document !== "undefined") {
        document.cookie = `jumpa_ref=${encodeURIComponent(cleanRef)}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`;
      }
    }

    setLoading(true);
    setError(null);

    try {
      writeSignUpEmail(cleanEmail);

      const res = await emailOtp.sendVerificationOtp({
        email: cleanEmail,
        type: "sign-in",
      });

      if (res.error) {
        console.error("[EmailAuthForm] Error sending OTP:", res.error);
        setError(res.error.message || "Failed to send verification code");
        setLoading(false);
        return;
      }

      setLoading(false);
      router.push(nextHref);
    } catch (err) {
      console.error("[EmailAuthForm] OTP dispatch failed:", err);
      const msg = err instanceof Error ? err.message : "Failed to send code";
      setError(msg);
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <TextField
            label="Enter your Email"
            type="email"
            name="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (error) setError(null);
            }}
            icon={<MailIcon />}
          />
          <FieldError>{error ?? undefined}</FieldError>
        </div>

        {showReferralField && (
          <TextField
            label={
              isFromUrl
                ? "Referral Code"
                : "Referral Code (Optional)"
            }
            type="text"
            name="referralCode"
            autoComplete="off"
            placeholder="e.g. R7K9WZ"
            value={referralCode}
            readOnly={isFromUrl}
            onChange={(e) => {
              if (!isFromUrl) {
                setReferralCode(e.target.value.toUpperCase());
              }
            }}
            icon={<UsersIcon />}
            trailing={
              isFromUrl ? (
                <span
                  className="flex items-center gap-1 text-[11px] font-medium text-jumpa-neutral-400"
                  title="Referral code applied from invite link"
                >
                  <LockIcon className="size-3.5" />
                  <span>Locked</span>
                </span>
              ) : null
            }
            className={isFromUrl ? "opacity-90" : ""}
          />
        )}
      </div>

      <Button
        type="submit"
        variant="gradient"
        size="lg"
        disabled={loading}
        className="disabled:opacity-50 cursor-pointer"
      >
        {loading ? "Sending code..." : "Continue"}
      </Button>
    </form>
  );
}
