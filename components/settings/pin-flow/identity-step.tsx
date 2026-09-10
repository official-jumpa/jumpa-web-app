"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
import { MailIcon } from "@/components/ui/icons/mail";
import { TextField } from "@/components/ui/text-field";
import { RESET_CODE_LENGTH } from "@/lib/pin-flows";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^\+?[\d\s-]{7,}$/;

export const IDENTITY_COPY = {
  heading: "Enter registered phone/email",
  description: `A ${RESET_CODE_LENGTH}-digit code will be sent to your registered mail or phone number.`,
};

/** Takes the address the reset code goes to. Either a mail address or a number. */
export function IdentityStep({
  value,
  sending,
  onSend,
}: {
  value: string;
  sending?: boolean;
  onSend: (contact: string) => void;
}) {
  const [contact, setContact] = useState(value);
  const [error, setError] = useState<string>();

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = contact.trim();
    if (!EMAIL.test(trimmed) && !PHONE.test(trimmed)) {
      setError("Enter the email address or phone number on your account.");
      return;
    }
    setError(undefined);
    onSend(trimmed);
  };

  return (
    <form onSubmit={submit} className="mt-8 flex flex-1 flex-col">
      <div className="flex flex-col gap-2">
        <TextField
          label="Enter mail/phone number"
          type="text"
          name="contact"
          inputMode="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={contact}
          onChange={(event) => {
            setContact(event.target.value);
            if (error) setError(undefined);
          }}
          aria-invalid={error ? true : undefined}
          icon={<MailIcon />}
        />
        <FieldError>{error}</FieldError>
      </div>

      <Button
        type="submit"
        variant="gradient"
        size="lg"
        disabled={sending}
        className="mt-auto disabled:opacity-50"
      >
        {sending ? "Sending code…" : "Send Code"}
      </Button>
    </form>
  );
}
