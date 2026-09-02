"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
import { MailIcon } from "@/components/ui/icons/mail";
import { TextField } from "@/components/ui/text-field";
import { emailOtp } from "@/lib/auth-client";

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function EmailAuthForm({
  nextHref = "/sign-up/verify-code",
}: {
  nextHref?: string;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!isValidEmail(trimmed)) {
      setError("Please enter a valid email address");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (typeof window !== "undefined") {
        sessionStorage.setItem("onboardingEmail", trimmed);
      }

      const res = await emailOtp.sendVerificationOtp({
        email: trimmed,
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
