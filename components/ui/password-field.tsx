"use client";

import { type ComponentPropsWithoutRef, useId, useState } from "react";
import { EyeOffIcon } from "@/components/ui/icons/eye-off";
import { LockIcon } from "@/components/ui/icons/lock";
import { TextField } from "@/components/ui/text-field";

type PasswordFieldProps = Omit<
  ComponentPropsWithoutRef<"input">,
  "type" | "icon"
> & {
  label: string;
};

/** Password input with a reveal toggle. */
export function PasswordField({ label, ...input }: PasswordFieldProps) {
  const [revealed, setRevealed] = useState(false);
  const id = useId();

  return (
    <TextField
      {...input}
      id={input.id ?? id}
      label={label}
      type={revealed ? "text" : "password"}
      icon={<LockIcon />}
      trailing={
        <button
          type="button"
          onClick={() => setRevealed((on) => !on)}
          aria-label={revealed ? "Hide password" : "Show password"}
          aria-pressed={revealed}
          className="shrink-0 text-jumpa-primary-950"
        >
          <EyeOffIcon className="size-6" />
        </button>
      }
    />
  );
}
