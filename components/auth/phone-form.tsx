"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
import { PhoneIcon } from "@/components/ui/icons/phone";
import { TextField } from "@/components/ui/text-field";
import { InfoNote } from "@/components/auth/info-note";
import { SIGN_UP_FLOW, SIGN_UP_KEYS, writeSignUpValue } from "@/lib/sign-up";
import {
  isValidNigerianPhone,
  normalizeNigerianPhone,
} from "@/lib/validations/bills.validation";

/** Phone number entry. Sends SMS OTP via or allows skipping for international users. */
export function PhoneForm({ nextHref }: { nextHref: string }) {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [skipping, setSkipping] = useState(false);

  const cleaned = phone.trim().replace(/[^\d+]/g, "");

  const isInternational = useMemo(() => {
    if (!cleaned) return false;
    if (cleaned.startsWith("+") && !cleaned.startsWith("+234")) return true;
    if (cleaned.startsWith("00")) return true;
    // Numbers not starting with 0 or +234
    if (!cleaned.startsWith("+234") && !cleaned.startsWith("0") && cleaned.length >= 7) {
      return true;
    }
    return false;
  }, [cleaned]);

  const handleSkip = async (phoneToSave?: string) => {
    if (submitting || skipping) return;
    setSkipping(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/verify-phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "skip", phone: phoneToSave || undefined }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        setError(data.error || "Failed to skip phone verification");
        setSkipping(false);
        return;
      }

      if (phoneToSave) {
        writeSignUpValue(SIGN_UP_KEYS.phone, phoneToSave);
      }

      // Check next onboarding step
      try {
        const setupRes = await fetch("/api/auth/wallet-setup");
        if (setupRes.ok) {
          const setupData = await setupRes.json();
          router.push(setupData.nextRoute || SIGN_UP_FLOW.password);
          return;
        }
      } catch {}

      router.push(SIGN_UP_FLOW.password);
    } catch (err: any) {
      console.error("[PhoneForm] Error skipping verification:", err);
      setError(err?.message || "Failed to proceed. Please try again.");
      setSkipping(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting || skipping) return;

    const rawPhone = phone.trim();
    if (!rawPhone) {
      setError("Please enter your phone number");
      return;
    }

    // If international number, save unverified and proceed directly to password setup
    if (isInternational) {
      if (cleaned.length < 7 || cleaned.length > 16) {
        setError("Please enter a valid international phone number");
        return;
      }
      setSubmitting(true);
      await handleSkip(cleaned.startsWith("+") ? cleaned : `+${cleaned}`);
      return;
    }

    // Nigerian phone validation
    if (!isValidNigerianPhone(cleaned)) {
      setError(
        "Please enter a valid Nigerian mobile phone number (e.g. 08123456789) or international format (+2348123456789)",
      );
      return;
    }

    // Standardize to canonical E.164 (+234...) format
    const local11 = normalizeNigerianPhone(cleaned);
    const canonicalPhone = `+234${local11.slice(1)}`;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/verify-phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send", phone: canonicalPhone }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        setError(data.error || "Failed to send verification code");
        setSubmitting(false);
        return;
      }

      writeSignUpValue(SIGN_UP_KEYS.phone, canonicalPhone);
      if (data.challengeId) {
        writeSignUpValue(SIGN_UP_KEYS.phoneChallengeId, data.challengeId);
      }
      router.push(nextHref);
    } catch (err: any) {
      console.error("[PhoneForm] Error sending OTP:", err);
      setError(
        err?.message || "Failed to send verification code. Please try again.",
      );
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-6">
      <div className="flex flex-col gap-2">
        <TextField
          label="Enter your Phone Number"
          type="tel"
          name="phone"
          inputMode="tel"
          autoComplete="tel"
          placeholder="08134623456 or +1234..."
          value={phone}
          disabled={submitting || skipping}
          onChange={(event) => {
            setPhone(event.target.value);
            if (error) setError(null);
          }}
          icon={<PhoneIcon />}
        />
        <FieldError>{error ?? undefined}</FieldError>

        {isInternational && !error ? (
          <InfoNote tone="brand" className="mt-1">
            SMS verification is supported for Nigerian numbers (+234) only. You can save your number and continue without verification
          </InfoNote>
        ) : null}
      </div>

      <div className="flex flex-col gap-3">
        <Button
          type="submit"
          variant="gradient"
          size="lg"
          disabled={submitting || skipping}
        >
          {submitting
            ? isInternational
              ? "Saving..."
              : "Sending code..."
            : isInternational
              ? "Save & Continue"
              : "Continue"}
        </Button>

        <button
          type="button"
          onClick={() => handleSkip()}
          disabled={submitting || skipping}
          className="cursor-pointer text-center text-xs font-semibold text-jumpa-neutral-500 hover:text-jumpa-neutral-800 disabled:opacity-50 transition-colors py-1"
        >
          {skipping ? "Skipping..." : "Skip for now"}
        </button>
      </div>
    </form>
  );
}
