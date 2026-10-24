"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuthContext } from "@/components/auth/AuthGuard";
import {
  SettingCard,
  SettingRule,
} from "@/components/settings/setting-section";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
import { CheckIcon } from "@/components/ui/icons/check";
import { CircleUserIcon } from "@/components/ui/icons/circle-user";
import { CreditCardNavIcon } from "@/components/ui/icons/credit-card-nav";
import { MobileIcon } from "@/components/ui/icons/mobile";
import { ShieldCheckIcon } from "@/components/ui/icons/shield-check";
import {
  type CreateAellaAccountInput,
  createAellaAccountSchema,
} from "@/lib/validations/aella.validation";

function VerifiedBadge() {
  return (
    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-jumpa-primary-600 text-jumpa-alt-400">
      <CheckIcon className="size-3.75" />
    </span>
  );
}

interface NgnConfirmProps {
  onContinue: (formData: CreateAellaAccountInput) => void;
  isLoading?: boolean;
  serverError?: string | null;
}

/** Form for confirming and collecting details required for NGN virtual bank accounts */
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
  const [mobileNumber, setMobileNumber] = useState(user?.phoneNumber || "");
  const [bvn, setBvn] = useState("");
  const [hasExistingDob, setHasExistingDob] = useState<boolean>(true);
  const [dob, setDob] = useState<string>("");

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [verified, setVerified] = useState<boolean>(false);
  const [isResolving, setIsResolving] = useState<boolean>(false);
  const [hasResolved, setHasResolved] = useState<boolean>(false);
  const [kycHadMissingDetails, setKycHadMissingDetails] = useState<boolean>(false);

  const needsResolution = kycHadMissingDetails && !hasResolved;

  const fullNameDisplay =
    lastName || firstName || middleName
      ? [lastName ? `${lastName},` : "", firstName, middleName].filter(Boolean).join(" ")
      : user?.name || "Full Name";

  useEffect(() => {
    let isMounted = true;
    async function checkKycAndProfile() {
      try {
        const [kycRes, profileRes] = await Promise.all([
          fetch("/api/v1/kyc?fields=details"),
          fetch("/api/v1/user"),
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
            data?.status === "verified",
          );
          setVerified(isDone);

          const details = data?.details;
          if (details) {
            if (details.firstName) setFirstName(details.firstName);
            if (details.middleName) setMiddleName(details.middleName);
            if (details.lastName) setLastName(details.lastName);

            // If critical KYC details (firstName or lastName) are missing from provider
            if (!details.firstName || !details.lastName) {
              setKycHadMissingDetails(true);
            }

            const dobExists = Boolean(details.dateOfBirth);
            setHasExistingDob(dobExists);
            if (details.dateOfBirth) {
              setDob(details.dateOfBirth);
            }
          } else {
            setHasExistingDob(false);
            setKycHadMissingDetails(true);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});

    const phoneStr = String(mobileNumber || user?.phoneNumber || "").trim();
    const cleanBvn = bvn.trim();
    const errors: Record<string, string> = {};

    if (!phoneStr) {
      errors.form = "Please verify your phone number first.";
    } else if (!cleanBvn) {
      errors.form = "Bank Verification Number (BVN) is required.";
      errors.bvn = "BVN is required";
    } else if (cleanBvn.length !== 11) {
      errors.form = "BVN must be exactly 11 digits.";
      errors.bvn = "BVN must be 11 digits";
    } else if (!needsResolution && !hasExistingDob && !dob) {
      errors.form = "Date of birth is required.";
      errors.dob = "Date of birth is required";
    }

    if (errors.form) {
      setFieldErrors(errors);
      return;
    }

    // Step 1: In-flow resolution if KYC details are incomplete
    if (needsResolution) {
      setIsResolving(true);
      try {
        const res = await fetch("/api/v1/ngn-account?resolve=true", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bvn: cleanBvn }),
        });
        const data = await res.json().catch(() => ({}));

        if (!res.ok || data.success === false) {
          setFieldErrors({
            form: data.error || "Failed to resolve BVN identity details. Please check the BVN.",
          });
          setIsResolving(false);
          return;
        }

        if (data.details) {
          if (data.details.firstName) setFirstName(data.details.firstName);
          if (data.details.lastName) setLastName(data.details.lastName);
          if (data.details.middleName) setMiddleName(data.details.middleName);
          if (data.details.dateOfBirth) {
            setDob(data.details.dateOfBirth);
            setHasExistingDob(true);
          }
          setHasResolved(true);
        }
      } catch (err: any) {
        setFieldErrors({
          form: err?.message || "Failed to verify BVN. Please try again.",
        });
      } finally {
        setIsResolving(false);
      }
      return;
    }

    // Step 2: Standard account creation confirmation
    const payload: CreateAellaAccountInput = {
      bvn: cleanBvn,
      ...((!hasExistingDob && dob) ? { dob } : {}),
    };

    const validation = createAellaAccountSchema.safeParse(payload);
    if (!validation.success) {
      const issue = validation.error.issues[0];
      errors.form = issue?.message || "Invalid input provided.";
      if (issue?.path?.[0] === "bvn") errors.bvn = issue.message;
      if (issue?.path?.[0] === "dob") errors.dob = issue.message;
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
          Please verify your identity details. Enter your BVN to create your dedicated Nigerian virtual account.
        </p>
      </div>

      {/* Auto-filled Profile Details */}
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
        <SettingRule />

        {/* Date of Birth Status */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <ShieldCheckIcon className="size-6 shrink-0 text-jumpa-primary-600" />
            <span className="truncate text-sm font-medium text-jumpa-black">
              Date of Birth:{" "}
              <span className="font-semibold text-jumpa-primary-950">
                {dob ? dob : hasExistingDob ? "Detected on record" : "Not on file"}
              </span>
            </span>
          </div>
          {hasExistingDob && dob ? (
            <VerifiedBadge />
          ) : (
            <span className="shrink-0 rounded-pill bg-jumpa-danger/10 px-2.5 py-1 text-xs font-semibold text-jumpa-danger">
              No DOB on file
            </span>
          )}
        </div>
      </SettingCard>

      {/* Account Creation */}
      <div className="flex flex-col gap-4">
        <div>
          <span className="text-xs font-semibold tracking-wide text-jumpa-primary-950/60 uppercase">
            Account Information
          </span>
          <p className="mt-1 text-xs text-jumpa-neutral-500 leading-relaxed">
            Enter your Bank Verification Number (BVN) to issue your dedicated account.
          </p>
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
            placeholder="e.g. 22122212221"
            className="h-12 w-full rounded-pill border border-jumpa-primary-100 bg-jumpa-primary-50 px-4 text-sm font-medium tracking-wide text-jumpa-primary-950 outline-none transition focus:border-jumpa-primary-400"
          />
          <FieldError>{fieldErrors.bvn}</FieldError>
        </div>

        {/* Date of Birth (Only shown when user KYC has no DOB on file, e.g. international passport) */}
        {!hasExistingDob ? (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-jumpa-primary-950">
                Date of Birth <span className="text-jumpa-danger">*</span>
              </label>
              <span className="text-[11px] text-jumpa-neutral-500">
                Required for your account
              </span>
            </div>
            <input
              type="date"
              required
              value={dob}
              max={new Date(Date.now() - 18 * 365.25 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]}
              onChange={(e) => setDob(e.target.value)}
              className="h-12 w-full rounded-pill border border-jumpa-primary-100 bg-jumpa-primary-50 px-4 text-sm font-medium tracking-wide text-jumpa-primary-950 outline-none transition focus:border-jumpa-primary-400"
            />
            <FieldError>{fieldErrors.dob}</FieldError>
          </div>
        ) : null}
      </div>

      {serverError || fieldErrors.form ? (
        <div className="rounded-2xl border border-jumpa-danger/20 bg-jumpa-danger/10 p-4 text-xs font-medium text-jumpa-danger">
          {serverError || fieldErrors.form}
        </div>
      ) : null}

      <div className="pt-2 pb-2">
        <Button
          variant="gradient"
          size="lg"
          type="submit"
          disabled={isLoading || isResolving}
          className="w-full"
        >
          {isResolving
            ? "Verifying BVN..."
            : isLoading
              ? "Creating Account..."
              : needsResolution
                ? "Continue"
                : "Confirm & Create Account"}
        </Button>
      </div>
    </form>
  );
}
