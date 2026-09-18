"use client";

import { type FormEvent, useState } from "react";
import { CtaPill } from "@/components/landing/cta-pill";
import { ArrowRightIcon } from "@/components/ui/icons/arrow-right";
import { AtSignIcon } from "@/components/ui/icons/at-sign";
import { CheckIcon } from "@/components/ui/icons/check";
import { MailBoldIcon } from "@/components/ui/icons/mail-bold";
import { triggerHaptic } from "@/lib/haptics";
import { BETA_CTA, CTA_LABEL, EMAIL_PLACEHOLDER } from "@/lib/landing";

type Status = "idle" | "pending" | "success" | "error";

interface UseWaitlistReturn {
  email: string;
  setEmail: (email: string) => void;
  status: Status;
  message: string | null;
  isNew: boolean | null;
  submit: (event: FormEvent) => Promise<void>;
  reset: () => void;
}

function extractAttribution() {
  if (typeof window === "undefined") return {};
  const params = new URLSearchParams(window.location.search);
  const utmSource = params.get("utm_source") || undefined;
  const utmMedium = params.get("utm_medium") || undefined;
  const utmCampaign = params.get("utm_campaign") || undefined;
  const refParam = params.get("ref") || params.get("referrer") || undefined;
  let referrer: string | undefined = refParam;

  if (!referrer && document.referrer) {
    try {
      referrer = new URL(document.referrer).hostname;
    } catch {
      referrer = document.referrer.slice(0, 100);
    }
  }

  return { utmSource, utmMedium, utmCampaign, referrer };
}

function useWaitlist(source: string): UseWaitlistReturn {
  const [email, setEmailState] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [position, setPosition] = useState<number | null>(null);
  const [isNew, setIsNew] = useState<boolean | null>(null);

  function setEmail(value: string) {
    setEmailState(value);
    if (status === "error") {
      setStatus("idle");
      setMessage(null);
    }
  }

  function reset() {
    setEmailState("");
    setStatus("idle");
    setMessage(null);
    setPosition(null);
    setIsNew(null);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const trimmed = email.trim().toLowerCase();

    if (!trimmed || status === "pending" || status === "success") return;

    // Client-side quick validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setStatus("error");
      setMessage("Please enter a valid email");
      triggerHaptic("medium");
      return;
    }

    setStatus("pending");
    setMessage(null);

    try {
      const attribution = extractAttribution();
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: trimmed,
          source,
          ...attribution,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setStatus("error");
        setMessage(data.error || "Unable to join the waitlist. Please try again");
        triggerHaptic("medium");
        return;
      }

      setStatus("success");
      setIsNew(Boolean(data.isNew));
      setPosition(data.position ?? null);
      setMessage(
        data.isNew === false
          ? BETA_CTA.alreadyJoinedNotice
          : BETA_CTA.successNotice
      );
      triggerHaptic("light");
    } catch (err) {
      console.error("Waitlist submit error:", err);
      setStatus("error");
      setMessage("Network error. Please check your connection and try again");
      triggerHaptic("medium");
    }
  }

  return { email, setEmail, status, message, isNew, submit, reset };
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
  const { email, setEmail, status, message, submit } =
    useWaitlist("landing-hero");

  return (
    // Full column below `md:`: the input is a fixed 16px (iOS zoom), which the
    // design's 250 cannot hold, so the placeholder clipped. Above it the width
    // is floored at 420px — the hero column at 768 — so the field and its CTA
    // don't render smaller on a tablet than on a phone; 30vw is the design's
    // 432/1440 and 768px its size at the 2560 ceiling.
    <div className="frame-432 w-320 md:w-[clamp(420px,30vw,768px)]">
      <form
        onSubmit={submit}
        className="flex items-center gap-10 rounded-full border-u-1 border-jumpa-grey-200 bg-jumpa-white pr-4 pl-24 shadow-landing-form"
      >
        <AtSignIcon className="size-16 shrink-0 text-jumpa-grey-450" />
        {/* maintain minimum of 16px font on input fields to prevent iphones from zooming in the page */}
        <EmailInput
          value={email}
          onChange={setEmail}
          disabled={status === "pending" || status === "success"}
          className="py-20 text-[16px] placeholder:text-jumpa-black md:text-u-14/17"
        />
        <CtaPill
          type="submit"
          disabled={status === "pending" || status === "success"}
          className="pill-u-16 md:w-181"
        >
          {status === "pending" ? (
            BETA_CTA.buttonSubmitting
          ) : status === "success" ? (
            <span className="inline-flex items-center gap-6">
              <CheckIcon className="size-16 shrink-0" />
              {BETA_CTA.buttonSuccess}
            </span>
          ) : (
            CTA_LABEL
          )}
        </CtaPill>
      </form>

      {status === "success" && (
        <p className="mt-8 pl-24 text-u-12/16 font-medium text-jumpa-primary-600">
          {message}
        </p>
      )}

      {status === "error" && message && (
        <p className="mt-8 pl-24 text-u-12/16 font-medium text-red-500">
          {message}
        </p>
      )}
    </div>
  );
}

/** Beta CTA: the frosted card with a label, a tinted field and a full-width pill. */
export function BetaEmailCard() {
  const { email, setEmail, status, message, isNew, submit } =
    useWaitlist("landing-beta");

  return (
    <form
      onSubmit={submit}
      className="flex w-full flex-col gap-10 overflow-clip rounded-u-22 border-u-2 border-jumpa-primary-50/50 bg-jumpa-white p-8 backdrop-blur-u-40 md:rounded-u-32 md:p-18"
    >
      <label htmlFor="beta-email" className="flex flex-col gap-8 px-10 md:px-0">
        <span className="pl-8 text-u-12/16 tracking-jumpa text-jumpa-secondary-950 md:pl-0 md:text-u-14/16 md:font-medium">
          {BETA_CTA.emailLabel}
        </span>
        <span className="flex items-center gap-8 rounded-full border-u-1 border-jumpa-primary-100 bg-jumpa-primary-50 py-16 pr-21 pl-24">
          <MailBoldIcon className="size-24 shrink-0 text-jumpa-primary-950" />
          {/* maintain minimum of 16px font on input fields to prevent iphones from zooming in the page */}
          <EmailInput
            id="beta-email"
            value={email}
            onChange={setEmail}
            disabled={status === "pending" || status === "success"}
            className="text-[16px] font-medium text-jumpa-primary-950 placeholder:text-jumpa-primary-950 md:text-u-14/16"
          />
        </span>
      </label>

      {status === "error" && message && (
        <p className="px-10 text-u-12/16 font-medium text-red-600 md:px-4">
          {message}
        </p>
      )}

      {status === "success" ? (
        <div className="flex flex-col gap-6 rounded-u-16 bg-jumpa-primary-50 p-14 text-jumpa-primary-950">
          <div className="flex items-center gap-8 font-semibold text-u-14/18 text-jumpa-primary-600">
            <span className="flex size-20 items-center justify-center rounded-full bg-jumpa-primary-600 text-jumpa-white">
              <CheckIcon className="size-14" />
            </span>
            <span>
              {isNew === false
                ? BETA_CTA.alreadyJoinedNotice
                : BETA_CTA.buttonSuccess}
            </span>
          </div>
          <p className="text-u-12/16 text-jumpa-primary-950/80">
            {BETA_CTA.note}
          </p>
        </div>
      ) : (
        <CtaPill
          type="submit"
          disabled={status === "pending"}
          className="pill-u-8.5 h-36 w-full md:pill-u-23.5 md:h-auto"
        >
          {status === "pending"
            ? BETA_CTA.buttonSubmitting
            : BETA_CTA.formTitle}
        </CtaPill>
      )}
    </form>
  );
}

/** Footer: the compact white pill with a lime arrow button. */
export function FooterEmailForm() {
  const { email, setEmail, status, message, submit } =
    useWaitlist("landing-footer");

  return (
    <div className="flex flex-col gap-6">
      <form
        onSubmit={submit}
        className="flex h-60 w-full shrink-0 items-center gap-2 rounded-full border-u-1 border-jumpa-grey-200 bg-jumpa-white pr-7.75 pl-26 md:w-325"
      >
        <AtSignIcon className="size-16 shrink-0 text-jumpa-grey-450 opacity-70" />
        {/* maintain minimum of 16px font on input fields to prevent iphones from zooming in the page */}
        <EmailInput
          value={email}
          onChange={setEmail}
          disabled={status === "pending" || status === "success"}
          className="text-[16px] placeholder:text-jumpa-grey-450 md:text-u-14/17"
        />
        <button
          type="submit"
          disabled={status === "pending" || status === "success"}
          aria-label={
            status === "success"
              ? BETA_CTA.buttonSuccess
              : status === "pending"
                ? BETA_CTA.buttonSubmitting
                : CTA_LABEL
          }
          className="tap flex h-44 w-64 shrink-0 items-center justify-center rounded-full bg-jumpa-alt-400 text-jumpa-white transition-all active:scale-95 disabled:opacity-80"
        >
          {status === "success" ? (
            <CheckIcon className="size-20 text-jumpa-white" />
          ) : status === "pending" ? (
            <span className="size-16 animate-spin rounded-full border-2 border-jumpa-white border-t-transparent" />
          ) : (
            <ArrowRightIcon className="size-20" />
          )}
        </button>
      </form>

      {status === "success" && (
        <p className="pl-26 text-u-12/16 font-medium text-jumpa-alt-300">
          ✓ {BETA_CTA.buttonSuccess}
        </p>
      )}

      {status === "error" && message && (
        <p className="pl-26 text-u-12/16 font-medium text-red-300">
          {message}
        </p>
      )}
    </div>
  );
}
