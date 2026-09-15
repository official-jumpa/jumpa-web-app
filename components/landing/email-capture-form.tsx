"use client";

import { type FormEvent, useState } from "react";
import { CtaPill } from "@/components/landing/cta-pill";
import { ArrowRightIcon } from "@/components/ui/icons/arrow-right";
import { AtSignIcon } from "@/components/ui/icons/at-sign";
import { MailBoldIcon } from "@/components/ui/icons/mail-bold";
import { BETA_CTA, CTA_LABEL, EMAIL_PLACEHOLDER } from "@/lib/landing";

type Status = "idle" | "pending" | "done";

// TODO(backend): there is no waitlist service yet. Wire `submit` to the real
// endpoint once one exists — right now it only simulates a submission.
function useWaitlist() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!email || status !== "idle") return;
    setStatus("pending");
    window.setTimeout(() => setStatus("done"), 600);
  }

  return { email, setEmail, status, submit };
}

const INPUT =
  "min-w-0 flex-1 bg-transparent text-jumpa-black outline-none disabled:opacity-60";

type EmailInputProps = {
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  className: string;
  /** Only where a visible `<label>` points at it; the other two self-describe. */
  id?: string;
};

function EmailInput({
  value,
  onChange,
  disabled,
  className,
  id,
}: EmailInputProps) {
  return (
    <input
      id={id}
      type="email"
      required
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={EMAIL_PLACEHOLDER}
      aria-label={id ? undefined : "Email address"}
      disabled={disabled}
      className={`${INPUT} ${className}`}
    />
  );
}

/** Hero: the white pill with the purple button inside. Sized in its own 432-unit frame. */
export function HeroEmailForm() {
  const { email, setEmail, status, submit } = useWaitlist();
  return (
    <div className="frame-432 w-250 lg:w-432">
      <form
        onSubmit={submit}
        className="flex items-center gap-10 rounded-full border-u-1 border-jumpa-grey-200 bg-jumpa-white pr-4 pl-24 shadow-landing-form"
      >
        <AtSignIcon className="size-16 shrink-0 text-jumpa-grey-450" />
        <EmailInput
          value={email}
          onChange={setEmail}
          disabled={status !== "idle"}
          className="py-20 text-u-14/17 placeholder:text-jumpa-black"
        />
        <CtaPill
          type="submit"
          disabled={status !== "idle"}
          className="pill-u-16 w-181"
        >
          {status === "done" ? "You're on the list" : CTA_LABEL}
        </CtaPill>
      </form>
    </div>
  );
}

/** Beta CTA: the frosted card with a label, a tinted field and a full-width pill. */
export function BetaEmailCard() {
  const { email, setEmail, status, submit } = useWaitlist();
  return (
    <form
      onSubmit={submit}
      className="flex w-full flex-col gap-10 overflow-clip rounded-u-22 border-u-2 border-jumpa-primary-50/50 bg-jumpa-white p-8 backdrop-blur-u-40 lg:rounded-u-32 lg:p-18"
    >
      <label htmlFor="beta-email" className="flex flex-col gap-8 px-10 lg:px-0">
        <span className="pl-8 text-u-12/16 tracking-jumpa text-jumpa-secondary-950 lg:pl-0 lg:text-u-14/16 lg:font-medium">
          {BETA_CTA.emailLabel}
        </span>
        <span className="flex items-center gap-8 rounded-full border-u-1 border-jumpa-primary-100 bg-jumpa-primary-50 py-16 pr-21 pl-24">
          <MailBoldIcon className="size-24 shrink-0 text-jumpa-primary-950" />
          <EmailInput
            id="beta-email"
            value={email}
            onChange={setEmail}
            disabled={status !== "idle"}
            className="text-u-10/16 font-medium text-jumpa-primary-950 placeholder:text-jumpa-primary-950 lg:text-u-14/16"
          />
        </span>
      </label>
      <CtaPill
        type="submit"
        disabled={status !== "idle"}
        className="pill-u-8.5 h-36 w-full lg:pill-u-23.5 lg:h-auto"
      >
        {status === "done" ? "You're on the list" : BETA_CTA.formTitle}
      </CtaPill>
    </form>
  );
}

/** Footer: the compact white pill with a lime arrow button. */
export function FooterEmailForm() {
  const { email, setEmail, status, submit } = useWaitlist();
  return (
    <form
      onSubmit={submit}
      className="flex h-60 w-full shrink-0 items-center gap-2 rounded-full border-u-1 border-jumpa-grey-200 bg-jumpa-white pr-7.75 pl-26 lg:w-325"
    >
      <AtSignIcon className="size-16 shrink-0 text-jumpa-grey-450 opacity-70" />
      <EmailInput
        value={email}
        onChange={setEmail}
        disabled={status !== "idle"}
        className="text-u-14/17 placeholder:text-jumpa-grey-450"
      />
      <button
        type="submit"
        disabled={status !== "idle"}
        aria-label={status === "done" ? "You're on the list" : CTA_LABEL}
        className="tap flex h-44 w-64 shrink-0 items-center justify-center rounded-full bg-jumpa-alt-400 text-jumpa-white active:scale-95 disabled:opacity-60"
      >
        <ArrowRightIcon className="size-20" />
      </button>
    </form>
  );
}
