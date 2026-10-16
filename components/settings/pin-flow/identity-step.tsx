"use client";

import { Button } from "@/components/ui/button";
import { MailIcon } from "@/components/ui/icons/mail";
import { TextField } from "@/components/ui/text-field";
import { RESET_CODE_LENGTH } from "@/lib/pin-flows";

export const IDENTITY_COPY = {
  heading: "Security Challenge",
  description: `A ${RESET_CODE_LENGTH}-digit code will be sent to your registered email address below.`,
};

/** Displays the non-editable registered email address to which the reset code is sent. */
export function IdentityStep({
  value,
  sending,
  onSend,
}: {
  value: string;
  sending?: boolean;
  onSend: (contact: string) => void;
}) {
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    onSend(value.trim());
  };

  return (
    <form onSubmit={submit} className="mt-8 flex flex-1 flex-col">
      <div className="flex flex-col gap-2">
        <TextField
          label="" //intentionally kept empty
          type="email"
          name="contact"
          value={value}
          readOnly
          tabIndex={-1}
          aria-readonly="true"
          className="select-none"
          icon={<MailIcon />}
        />
      </div>

      <Button
        type="submit"
        variant="gradient"
        size="lg"
        disabled={sending || !value}
        className="mt-auto disabled:opacity-50"
      >
        {sending ? "Sending code…" : "Send Code"}
      </Button>
    </form>
  );
}
