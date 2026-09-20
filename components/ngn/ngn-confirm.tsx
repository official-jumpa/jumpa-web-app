"use client";

import { useEffect, useState } from "react";
import { useAuthContext } from "@/components/auth/AuthGuard";
import { SettingRow } from "@/components/settings/setting-row";
import {
  SettingCard,
  SettingRule,
} from "@/components/settings/setting-section";
import { Button } from "@/components/ui/button";
import { CheckIcon } from "@/components/ui/icons/check";
import { CircleUserIcon } from "@/components/ui/icons/circle-user";
import { GlobeIcon } from "@/components/ui/icons/globe";
import { IdCardIcon } from "@/components/ui/icons/id-card";
import { ShieldCheckIcon } from "@/components/ui/icons/shield-check";
import { mapCountryCodeToName } from "@/lib/ngn-account";

function VerifiedBadge() {
  return (
    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-jumpa-primary-600 text-jumpa-alt-400">
      <CheckIcon className="size-3.75" />
    </span>
  );
}

interface NgnConfirmProps {
  onContinue: () => void;
  isLoading?: boolean;
  serverError?: string | null;
}

/** Form for confirming user profile and activating instant NGN virtual banking */
export function NgnConfirm({
  onContinue,
  isLoading = false,
  serverError = null,
}: NgnConfirmProps) {
  const auth = useAuthContext();
  const user = auth?.user;

  const [verified, setVerified] = useState<boolean>(false);
  const countryName = mapCountryCodeToName(user?.country || "NG");

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
              data?.stage === "completed"
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
    onContinue();
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div>
        <h1 className="mt-7.25 text-[28px] leading-7.5 font-semibold text-jumpa-black">
          Confirm your details
        </h1>
        <p className="mt-2 text-sm leading-4 text-jumpa-black">
          Your Nigerian Naira account will be activated and linked to your profile
        </p>
      </div>

      {serverError ? (
        <div className="rounded-2xl border border-jumpa-danger/20 bg-jumpa-danger/10 p-4 text-xs font-medium text-jumpa-danger">
          {serverError}
        </div>
      ) : null}

      {/* Profile Details */}
      <div>
        <span className="text-xs font-semibold tracking-wide text-jumpa-primary-950/60 uppercase">
          Profile Info
        </span>
        <SettingCard className="mt-2">
          <SettingRow
            icon={CircleUserIcon}
            label="Full Name"
            value={user?.name || "Jumpa Account"}
          />
          <SettingRule />
          <SettingRow
            icon={ShieldCheckIcon}
            label="Email Address"
            value={user?.email || "Email Address"}
          />
          <SettingRule />
          <SettingRow
            icon={GlobeIcon}
            label="Country"
            value={countryName}
          />
          <SettingRule />
          <SettingRow
            icon={IdCardIcon}
            label="KYC Status"
            action={verified ? <VerifiedBadge /> : <span className="text-xs text-jumpa-neutral-400">Verified</span>}
          />
        </SettingCard>
      </div>

      {/* Feature notice */}
      <div className="rounded-2xl border border-jumpa-primary-100 bg-jumpa-primary-50/50 p-4 text-xs text-jumpa-primary-950/80 leading-relaxed">
        <p>
          Once activated, you can fund your naira account directly via Nigerian bank transfer or stablecoin
        </p>
      </div>

      <div className="pt-4 pb-2">
        <Button
          variant="gradient"
          size="lg"
          type="submit"
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? "Activating Account..." : "Activate NGN Account"}
        </Button>
      </div>
    </form>
  );
}
