"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuthContext } from "@/components/auth/AuthGuard";
import { SettingRow } from "@/components/settings/setting-row";
import {
  SettingCard,
  SettingRule,
} from "@/components/settings/setting-section";
import { Button } from "@/components/ui/button";
import { DateField } from "@/components/ui/date-field";
import { FieldError } from "@/components/ui/field-error";
import { CheckIcon } from "@/components/ui/icons/check";
import { GlobeIcon } from "@/components/ui/icons/globe";
import { IdCardIcon } from "@/components/ui/icons/id-card";
import { ShieldCheckIcon } from "@/components/ui/icons/shield-check";
import { mapCountryCodeToName } from "@/lib/ngn-account";
import {
  type CreateNgnAccountInput,
  createNgnAccountSchema,
} from "@/lib/validations/fossapay.validation";

function VerifiedBadge() {
  return (
    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-jumpa-primary-600 text-jumpa-alt-400">
      <CheckIcon className="size-3.75" />
    </span>
  );
}

// Compute maximum date of birth for 16 years old
function getMaxDob(): string {
  const date = new Date();
  date.setFullYear(date.getFullYear() - 16);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Floor for the year dropdown — without one it would list every year there is. */
const MIN_DOB = `${new Date().getFullYear() - 100}-01-01`;

interface NgnConfirmProps {
  onContinue: (formData: CreateNgnAccountInput) => void;
  isLoading?: boolean;
  serverError?: string | null;
}

/** Form for confirming and collecting details required by FossaPay for NGN virtual bank accounts */
export function NgnConfirm({
  onContinue,
  isLoading = false,
  serverError = null,
}: NgnConfirmProps) {
  const auth = useAuthContext();
  const user = auth?.user;

  // Split user name into firstName / lastName defaults
  const rawName = (user?.name || "").trim();
  const parts = rawName ? rawName.split(/\s+/) : [];
  const defaultFirst = parts[0] || "";
  const defaultLast = parts.length > 1 ? parts.slice(1).join(" ") : "";

  const [firstName, setFirstName] = useState(defaultFirst);
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState(defaultLast);
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [mobileNumber, setMobileNumber] = useState("+234");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [verified, setVerified] = useState<boolean>(false);

  const countryName = mapCountryCodeToName(user?.country || "NG");
  const maxDob = getMaxDob();

  useEffect(() => {
    let isMounted = true;
    try {
      const savedKyc = localStorage.getItem("jumpa_kyc_completed");
      if (savedKyc !== null) {
        setVerified(savedKyc === "true");
      }
    } catch {}

    async function checkKyc() {
      try {
        const res = await fetch("/api/kyc");
        if (res.ok && isMounted) {
          const data = await res.json();
          const isDone = Boolean(
            data?.isCompleted ||
              data?.status === "approved" ||
              data?.stage === "completed",
          );
          setVerified(isDone);
          try {
            localStorage.setItem("jumpa_kyc_completed", String(isDone));
          } catch {}
        }
      } catch (err) {
        console.warn("Error checking KYC:", err);
      }
    }

    checkKyc();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});

    if (!verified) {
      setFieldErrors({
        kyc: "Please complete identity verification (KYC) before opening a Naira account.",
      });
      return;
    }

    const formData = {
      firstName,
      middleName: middleName || undefined,
      lastName,
      dateOfBirth,
      mobileNumber,
      address,
      city,
    };

    const validation = createNgnAccountSchema.safeParse(formData);

    if (!validation.success) {
      const errors: Record<string, string> = {};
      for (const issue of validation.error.issues) {
        const key = issue.path[0] as string;
        if (key && !errors[key]) {
          errors[key] = issue.message;
        }
      }
      setFieldErrors(errors);
      return;
    }

    onContinue(validation.data);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div>
        <h1 className="mt-7.25 text-[28px] leading-7.5 font-semibold text-jumpa-black">
          Confirm your details
        </h1>
        <p className="mt-2 text-sm leading-4 text-jumpa-black">
          Please verify your identity details. These are required by our banking
          partner to issue your dedicated Nigerian account.
        </p>
      </div>

      {serverError ? (
        <div className="rounded-2xl border border-jumpa-danger/20 bg-jumpa-danger/10 p-4 text-xs font-medium text-jumpa-danger">
          {serverError}
        </div>
      ) : null}

      {/* Auto-filled Profile Details */}
      <div>
        <span className="text-xs font-semibold tracking-wide text-jumpa-primary-950/60 uppercase">
          Verified Profile Info
        </span>
        <SettingCard className="mt-2">
          <SettingRow
            icon={ShieldCheckIcon}
            label="Email"
            value={user?.email || "Account email"}
          />
          <SettingRule />
          <SettingRow icon={GlobeIcon} label="Country" value={countryName} />
          <SettingRule />
          <SettingRow
            icon={IdCardIcon}
            label="KYC verified"
            action={
              verified ? (
                <VerifiedBadge />
              ) : (
                <Link
                  href="/kyc"
                  className="rounded-pill bg-jumpa-primary-50 px-2.5 py-1 text-xs font-semibold text-jumpa-primary-600 underline underline-offset-2 hover:opacity-80"
                >
                  Verify Now
                </Link>
              )
            }
          />
        </SettingCard>
      </div>

      {/* Required Banking Partner Details */}
      <div className="flex flex-col gap-4">
        <span className="text-xs font-semibold tracking-wide text-jumpa-primary-950/60 uppercase">
          Account Information
        </span>

        {/* First & Middle Names */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-jumpa-primary-950">
              First Name <span className="text-jumpa-danger">*</span>
            </label>
            <input
              type="text"
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="e.g. John"
              className="h-12 w-full rounded-pill border border-jumpa-primary-100 bg-jumpa-primary-50 px-4 text-sm font-medium text-jumpa-primary-950 outline-none transition focus:border-jumpa-primary-400"
            />
            <FieldError>{fieldErrors.firstName}</FieldError>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-jumpa-primary-950">
              Middle Name{" "}
              <span className="text-jumpa-neutral-400">(Optional)</span>
            </label>
            <input
              type="text"
              value={middleName}
              onChange={(e) => setMiddleName(e.target.value)}
              placeholder="e.g. Michael"
              className="h-12 w-full rounded-pill border border-jumpa-primary-100 bg-jumpa-primary-50 px-4 text-sm font-medium text-jumpa-primary-950 outline-none transition focus:border-jumpa-primary-400"
            />
            <FieldError>{fieldErrors.middleName}</FieldError>
          </div>
        </div>

        {/* Last Name */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-jumpa-primary-950">
            Last Name <span className="text-jumpa-danger">*</span>
          </label>
          <input
            type="text"
            required
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="e.g. Doe"
            className="h-12 w-full rounded-pill border border-jumpa-primary-100 bg-jumpa-primary-50 px-4 text-sm font-medium text-jumpa-primary-950 outline-none transition focus:border-jumpa-primary-400"
          />
          <FieldError>{fieldErrors.lastName}</FieldError>
        </div>

        {/* Date of Birth */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-jumpa-primary-950">
              Date of Birth <span className="text-jumpa-danger">*</span>
            </label>
            <span className="text-[11px] text-jumpa-neutral-500">
              Must be at least 16 years old
            </span>
          </div>
          {/* Our own calendar, not the native control: `input[type=date]` sizes
              itself to its widget rather than to `w-full`, which pushed the page
              wider than the column and let it scroll off the white. */}
          <DateField
            label="Date of Birth"
            variant="account"
            placeholder="Select your date of birth"
            value={dateOfBirth}
            min={MIN_DOB}
            max={maxDob}
            dropdown
            invalid={Boolean(fieldErrors.dateOfBirth)}
            onChange={setDateOfBirth}
          />
          <FieldError>{fieldErrors.dateOfBirth}</FieldError>
        </div>

        {/* Phone Number */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-jumpa-primary-950">
              Phone Number <span className="text-jumpa-danger">*</span>
            </label>
            <span className="text-[11px] text-jumpa-neutral-500">
              Include country code (+234...)
            </span>
          </div>
          <input
            type="tel"
            required
            value={mobileNumber}
            onChange={(e) => setMobileNumber(e.target.value)}
            placeholder="+2348012345678"
            className="h-12 w-full rounded-pill border border-jumpa-primary-100 bg-jumpa-primary-50 px-4 text-sm font-medium text-jumpa-primary-950 outline-none transition focus:border-jumpa-primary-400"
          />
          <FieldError>{fieldErrors.mobileNumber}</FieldError>
        </div>

        {/* Residential Address */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-jumpa-primary-950">
            Residential Address <span className="text-jumpa-danger">*</span>
          </label>
          <input
            type="text"
            required
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="e.g. 14 Adeola Odeku Street, Victoria Island"
            className="h-12 w-full rounded-pill border border-jumpa-primary-100 bg-jumpa-primary-50 px-4 text-sm font-medium text-jumpa-primary-950 outline-none transition focus:border-jumpa-primary-400"
          />
          <FieldError>{fieldErrors.address}</FieldError>
        </div>

        {/* City */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-jumpa-primary-950">
            City <span className="text-jumpa-danger">*</span>
          </label>
          <input
            type="text"
            required
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="e.g. Lagos"
            className="h-12 w-full rounded-pill border border-jumpa-primary-100 bg-jumpa-primary-50 px-4 text-sm font-medium text-jumpa-primary-950 outline-none transition focus:border-jumpa-primary-400"
          />
          <FieldError>{fieldErrors.city}</FieldError>
        </div>
      </div>

      {fieldErrors.kyc && (
        <div className="flex items-center justify-between gap-3 rounded-tile border border-jumpa-danger/30 bg-jumpa-danger/10 px-4 py-3 text-xs leading-4 font-medium text-jumpa-danger">
          <span>{fieldErrors.kyc}</span>
          <Link
            href="/kyc"
            className="shrink-0 font-semibold underline underline-offset-2 hover:opacity-80"
          >
            Complete KYC
          </Link>
        </div>
      )}

      <div className="pt-4 pb-2">
        <Button
          variant="gradient"
          size="lg"
          type="submit"
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? "Creating Account..." : "Confirm & Create Account"}
        </Button>
      </div>
    </form>
  );
}
