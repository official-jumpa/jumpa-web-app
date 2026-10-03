"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { CalendarIcon } from "@/components/ui/icons/calendar";
import { CheckIcon } from "@/components/ui/icons/check";
import { CircleUserIcon } from "@/components/ui/icons/circle-user";
import { CreditCardNavIcon } from "@/components/ui/icons/credit-card-nav";
import { GlobeIcon } from "@/components/ui/icons/globe";
import { IdCardIcon } from "@/components/ui/icons/id-card";
import { MobileIcon } from "@/components/ui/icons/mobile";
import { PhoneAltIcon } from "@/components/ui/icons/phone-alt";
import { ShieldCheckIcon } from "@/components/ui/icons/shield-check";
import { mapCountryCodeToName } from "@/lib/ngn-account";
import {
  type CreateBellmonieAccountInput,
  createBellmonieAccountSchema,
} from "@/lib/validations/bellmonie.validation";

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
  onContinue: (formData: CreateBellmonieAccountInput) => void;
  isLoading?: boolean;
  serverError?: string | null;
}

/** Form for confirming and collecting details required by Bellmonie for NGN virtual bank accounts */
export function NgnConfirm({
  onContinue,
  isLoading = false,
  serverError = null,
}: NgnConfirmProps) {
  const router = useRouter();
  const auth = useAuthContext();
  const user = auth?.user;

  const handleVerifyPhoneClick = (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      fetch("/api/auth/verify-phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset-skip" }),
      }).catch(() => {});
    } catch {}
    router.push("/sign-up/phone?from=bank");
  };

  // Split user name into firstName / lastName defaults
  const rawName = (user?.name || "").trim();
  const parts = rawName ? rawName.split(/\s+/) : [];
  const defaultFirst = parts[0] || "";
  const defaultLast = parts.length > 1 ? parts.slice(1).join(" ") : "";

  const [firstName, setFirstName] = useState(defaultFirst);
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState(defaultLast);
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [mobileNumber, setMobileNumber] = useState(user?.phoneNumber || "");
  const [address, setAddress] = useState("");
  const [bvn, setBvn] = useState("");
  const [nin, setNin] = useState("");
  const [gender, setGender] = useState<"male" | "female">("male");

  // Track which fields are locked from verified DB / KYC
  const [lockedFields, setLockedFields] = useState<Record<string, boolean>>({
    firstName: Boolean(defaultFirst),
    lastName: Boolean(defaultLast),
    phone: Boolean(user?.phoneNumber),
    email: Boolean(user?.email),
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [verified, setVerified] = useState<boolean>(false);

  const countryName = mapCountryCodeToName(user?.country || "NG");
  const maxDob = getMaxDob();

  const fullNameDisplay =
    lastName || firstName || middleName
      ? [lastName ? `${lastName},` : "", firstName, middleName].filter(Boolean).join(" ")
      : user?.name || "Full Name";

  useEffect(() => {
    let isMounted = true;
    try {
      const savedKyc = localStorage.getItem("jumpa_kyc_completed");
      if (savedKyc !== null) {
        setVerified(savedKyc === "true");
      }
    } catch { }

    async function checkKycAndProfile() {
      try {
        const [kycRes, profileRes] = await Promise.all([
          fetch("/api/kyc"),
          fetch("/api/user/profile"),
        ]);

        let freshPhone = user?.phoneNumber || "";
        if (profileRes.ok && isMounted) {
          const profileData = await profileRes.json();
          if (profileData?.profile?.phoneNumber) {
            freshPhone = profileData.profile.phoneNumber;
            setMobileNumber(freshPhone);
          }
        }

        if (kycRes.ok && isMounted) {
          const data = await kycRes.json();
          const isDone = Boolean(
            data?.isCompleted ||
            data?.status === "approved" ||
            data?.stage === "completed",
          );
          setVerified(isDone);
          try {
            localStorage.setItem("jumpa_kyc_completed", String(isDone));
          } catch { }

          const details = data?.details;
          const newLocked: Record<string, boolean> = {
            firstName: Boolean(defaultFirst || details?.firstName),
            lastName: Boolean(defaultLast || details?.lastName),
            middleName: Boolean(details?.middleName),
            phone: Boolean(freshPhone),
            email: Boolean(user?.email),
            dateOfBirth: Boolean(details?.dateOfBirth),
            gender: Boolean(details?.gender),
            address: Boolean(details?.address?.street),
            bvn: Boolean(data?.idType === "bvn" && data?.idNumber),
          };
          setLockedFields(newLocked);

          if (details) {
            if (details.firstName) setFirstName(details.firstName);
            if (details.middleName) setMiddleName(details.middleName);
            if (details.lastName) setLastName(details.lastName);
            if (details.dateOfBirth) {
              setDateOfBirth(String(details.dateOfBirth).replace(/\//g, "-"));
            }
            if (details.gender) {
              const g = String(details.gender).toLowerCase();
              if (g === "female" || g === "f") setGender("female");
              else setGender("male");
            }
            if (details.address?.street) {
              const street = [details.address.street, details.address.city, details.address.state]
                .filter(Boolean)
                .join(", ");
              setAddress(street);
            }
          }

          if (data?.idType === "bvn" && data?.idNumber) {
            setBvn(data.idNumber);
          }
        }
      } catch (err) {
        console.warn("Error checking KYC/profile:", err);
      }
    }

    checkKycAndProfile();
    return () => {
      isMounted = false;
    };
  }, [defaultFirst, defaultLast, user?.phoneNumber, user?.email]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});

    const phoneStr = String(mobileNumber || user?.phoneNumber || "").trim();
    const errors: Record<string, string> = {};

    if (!firstName.trim()) {
      errors.form = "First name is missing from your verified profile.";
    } else if (!lastName.trim()) {
      errors.form = "Last name is missing from your verified profile.";
    } else if (!phoneStr) {
      errors.form = "Please verify your phone number first.";
    } else if (!user?.email?.trim()) {
      errors.form = "Email address is missing from your account.";
    } else if (!dateOfBirth.trim()) {
      errors.form = "Date of birth is missing from your profile.";
    } else if (!address.trim()) {
      errors.form = "Residential address is required.";
      errors.address = "Address is required";
    } else if (!bvn.trim()) {
      errors.form = "Bank Verification Number (BVN) is required.";
      errors.bvn = "BVN is required";
    }

    if (errors.form) {
      setFieldErrors(errors);
      return;
    }

    const formData = {
      firstName: firstName.trim(),
      middleName: middleName.trim() || undefined,
      lastName: lastName.trim(),
      phoneNumber: phoneStr,
      emailAddress: user?.email.trim(),
      address: address.trim(),
      bvn: bvn.trim(),
      gender: gender || "male",
      dateOfBirth: dateOfBirth.replace(/-/g, "/").trim(),
    };

    const validation = createBellmonieAccountSchema.safeParse(formData);

    if (!validation.success) {
      const firstIssue = validation.error.issues[0];
      for (const issue of validation.error.issues) {
        const key = issue.path[0] as string;
        if (key && !errors[key]) {
          errors[key] = issue.message;
        }
      }
      errors.form = firstIssue?.message || "Please complete all required fields.";
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
          Please verify your identity details. These are required by our banking partner to issue your dedicated Nigerian account.
        </p>
      </div>

      {/* Auto-filled Profile Details matching reference */}
      <SettingCard className="mt-2">
        {/* Full Name: Surname, First Middle */}
        <div className="flex items-center gap-3">
          <CircleUserIcon className="size-6 shrink-0 text-jumpa-primary-600" />
          <span className="truncate text-sm font-medium text-jumpa-black">
            {fullNameDisplay}
          </span>
        </div>
        <SettingRule />

        {/* Email */}
        <div className="flex items-center gap-3">
          <ShieldCheckIcon className="size-6 shrink-0 text-jumpa-primary-600" />
          <span className="truncate text-sm font-medium text-jumpa-black">
            {user?.email || "Account email"}
          </span>
        </div>
        <SettingRule />

        {/* Phone */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <MobileIcon className="size-6 shrink-0 text-jumpa-primary-600" />
            <span className="truncate text-sm font-medium text-jumpa-black">
              {user?.phoneNumber || mobileNumber || (
                <button
                  type="button"
                  onClick={handleVerifyPhoneClick}
                  className="cursor-pointer text-jumpa-primary-600 underline underline-offset-2 hover:opacity-80"
                >
                  Verify Phone Number
                </button>
              )}
            </span>
          </div>
          {(user?.phoneNumber || mobileNumber) ? (
            <VerifiedBadge />
          ) : (
            <button
              type="button"
              onClick={handleVerifyPhoneClick}
              className="cursor-pointer rounded-pill bg-jumpa-primary-50 px-2.5 py-1 text-xs font-semibold text-jumpa-primary-600 underline underline-offset-2 hover:opacity-80"
            >
              Verify Now
            </button>
          )}
        </div>
        <SettingRule />

        {/* Date of Birth */}
        <div className="flex items-center gap-3">
          <CalendarIcon className="size-6 shrink-0 text-jumpa-primary-600" />
          <span className="truncate text-sm font-medium text-jumpa-black">
            {dateOfBirth || "Verified DOB"}
          </span>
        </div>
        <SettingRule />

        {/* KYC Verification */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <CreditCardNavIcon className="size-6 shrink-0 text-jumpa-primary-600" />
            <span className="truncate text-sm font-medium text-jumpa-black">
              KYC Verification
            </span>
          </div>
          {verified ? (
            <VerifiedBadge />
          ) : (
            <Link
              href="/kyc"
              className="rounded-pill bg-jumpa-primary-50 px-2.5 py-1 text-xs font-semibold text-jumpa-primary-600 underline underline-offset-2 hover:opacity-80"
            >
              Verify Now
            </Link>
          )}
        </div>
      </SettingCard>

      {/* Required Banking Partner Details */}
      <div className="flex flex-col gap-4">
        <div>
          <span className="text-xs font-semibold tracking-wide text-jumpa-primary-950/60 uppercase">
            Account Information
          </span>
          <p className="mt-1 text-xs text-jumpa-neutral-500 leading-relaxed">
            The details above are from your verified ID. Please enter your residential address and BVN to proceed.
          </p>
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
            placeholder="e.g. 14 Adeola Odeku Street, Victoria Island, Lagos"
            className="h-12 w-full rounded-pill border border-jumpa-primary-100 bg-jumpa-primary-50 px-4 text-sm font-medium text-jumpa-primary-950 outline-none transition focus:border-jumpa-primary-400"
          />
          <FieldError>{fieldErrors.address}</FieldError>
        </div>

        {/* Bank Verification Number (BVN) */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-jumpa-primary-950">
              Bank Verification Number (BVN) <span className="text-jumpa-danger">*</span>
            </label>
            <span className="text-[11px] text-jumpa-neutral-500">
              11-digit BVN
            </span>
          </div>
          <input
            type="text"
            inputMode="numeric"
            maxLength={11}
            required
            value={bvn}
            onChange={(e) => setBvn(e.target.value.replace(/\D/g, "").slice(0, 11))}
            placeholder="e.g. 22233344455"
            className="h-12 w-full rounded-pill border border-jumpa-primary-100 bg-jumpa-primary-50 px-4 text-sm font-medium tracking-wide text-jumpa-primary-950 outline-none transition focus:border-jumpa-primary-400"
          />
          <FieldError>{fieldErrors.bvn}</FieldError>
        </div>
      </div>

      {serverError || fieldErrors.form ? (
        <div className="rounded-2xl border border-jumpa-warning/20 bg-jumpa-warning/10 p-4 text-xs font-medium text-jumpa-warning">
          {serverError || fieldErrors.form}
        </div>
      ) : null}

      <div className="pt-2 pb-2">
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
