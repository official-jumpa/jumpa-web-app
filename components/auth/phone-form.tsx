"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
import { PhoneIcon } from "@/components/ui/icons/phone";
import { TextField } from "@/components/ui/text-field";
import {
  isValidPhone,
  normalisePhone,
  SIGN_UP_KEYS,
  writeSignUpValue,
} from "@/lib/sign-up";

/** Phone number entry. Mirrors `EmailAuthForm` so the two halves read alike. */
// TODO(backend): send the SMS code here before advancing.
export function PhoneForm({ nextHref }: { nextHref: string }) {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (!isValidPhone(phone)) {
      setError("Please enter a valid phone number");
      return;
    }

    writeSignUpValue(SIGN_UP_KEYS.phone, normalisePhone(phone));
    router.push(nextHref);
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
          placeholder="813462346456"
          value={phone}
          onChange={(event) => {
            setPhone(event.target.value);
            if (error) setError(null);
          }}
          icon={<PhoneIcon />}
        />
        <FieldError>{error ?? undefined}</FieldError>
      </div>

      <Button type="submit" variant="gradient" size="lg">
        Continue
      </Button>
    </form>
  );
}
