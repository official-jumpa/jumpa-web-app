"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
import { PhoneIcon } from "@/components/ui/icons/phone";
import { TextField } from "@/components/ui/text-field";
import { SIGN_UP_KEYS, writeSignUpValue } from "@/lib/sign-up";
import {
  isValidNigerianPhone,
  normalizeNigerianPhone,
} from "@/lib/validations/bills.validation";

/** Phone number entry. Sends SMS OTP via Better Auth & SmartSMS before advancing. */
export function PhoneForm({ nextHref }: { nextHref: string }) {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting) return;

    const rawPhone = phone.trim();
    if (!rawPhone) {
      setError("Please enter your phone number");
      return;
    }

    const cleaned = rawPhone.replace(/[^\d+]/g, "");

    // Fallback notice for non-Nigerian phone numbers
    if (
      (cleaned.startsWith("+") && !cleaned.startsWith("+234")) ||
      cleaned.startsWith("00")
    ) {
      setError(
        "Phone number verification is currently supported for Nigerian phone numbers only (+234).",
      );
      return;
    }

    if (!isValidNigerianPhone(cleaned)) {
      setError(
        "Please enter a valid Nigerian mobile phone number (e.g. 08123456789)",
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
          placeholder="08134623456"
          value={phone}
          disabled={submitting}
          onChange={(event) => {
            setPhone(event.target.value);
            if (error) setError(null);
          }}
          icon={<PhoneIcon />}
        />
        <FieldError>{error ?? undefined}</FieldError>
      </div>

      <Button
        type="submit"
        variant="gradient"
        size="lg"
        disabled={submitting}
      >
        {submitting ? "Sending code..." : "Continue"}
      </Button>
    </form>
  );
}
