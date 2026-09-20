"use client";

import { Fragment, useEffect, useState } from "react";
import Link from "next/link";
import { CopyButton } from "@/components/auth/copy-button";
import { SettingRow } from "@/components/settings/setting-row";
import {
  SettingCard,
  SettingRule,
  SettingSection,
} from "@/components/settings/setting-section";
import { TagsIcon } from "@/components/ui/icons/tags";
import { BankIcon } from "@/components/ui/icons/bank";
import { ScreenHeader } from "@/components/ui/screen-header";
import { Button } from "@/components/ui/button";
import { JumpaLoader } from "@/components/ui/jumpa-loader";
import { ShareDetailsButton } from "@/components/ngn/share-details-button";

interface NgnAccountData {
  bankName: string;
  accountNumber: string;
  accountName: string;
  status: string;
}

interface NgnBalanceData {
  availableBalance: number;
  ledgerBalance: number;
  currency: string;
}

/** The issued NGN account details screen, showing live provider details. */
export function NgnAccountDetails() {
  const [loading, setLoading] = useState(true);
  const [account, setAccount] = useState<NgnAccountData | null>(null);
  const [balance, setBalance] = useState<NgnBalanceData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function fetchAccount() {
      try {
        console.log("[NgnAccountDetails] Fetching NGN account details...");
        const res = await fetch("/api/ngn-account");
        if (!res.ok) {
          if (res.status === 404) {
            if (isMounted) setAccount(null);
            return;
          }
          throw new Error("Failed to load account details");
        }

        const data = await res.json();
        if (isMounted && data.hasAccount && data.account) {
          console.log("[NgnAccountDetails] Account loaded:", data.account.accountNumber);
          setAccount(data.account);
          if (data.balance) {
            setBalance(data.balance);
          }
        }
      } catch (err: any) {
        console.error("[NgnAccountDetails] Error fetching details:", err);
        if (isMounted) setError(err.message || "Failed to load account");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchAccount();
    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center px-4.5 pt-[calc(env(safe-area-inset-top)+1.5rem)] pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
        <JumpaLoader />
        <p className="mt-3 text-xs font-medium text-jumpa-neutral-500">
          Loading your NGN account details...
        </p>
      </div>
    );
  }

  if (!account || error) {
    return (
      <div className="flex min-h-dvh flex-col px-4.5 pt-[calc(env(safe-area-inset-top)+1.5rem)] pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
        <ScreenHeader back="/home" title="NGN Account" round />
        <div className="my-auto flex flex-col items-center text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-jumpa-primary-50 text-jumpa-primary-600">
            <BankIcon className="size-7" />
          </div>
          <h2 className="mt-4 text-xl font-semibold text-jumpa-black">
            No NGN Account Found
          </h2>
          <p className="mt-2 max-w-xs text-sm text-jumpa-neutral-500">
            You have not opened an NGN virtual bank account yet.
          </p>
          <div className="mt-6 w-full max-w-xs">
            <Button variant="gradient" size="lg" href="/ngn-account">
              Open NGN Account
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const fields = [
    { label: "Bank Name", value: account.bankName || "Provider Bank" },
    { label: "Account Number", value: account.accountNumber || "---" },
    { label: "Account Name", value: account.accountName || "Jumpa User" },
  ];

  const shareText = fields.map((f) => `${f.label}: ${f.value}`).join("\n");

  const formattedBalance = balance
    ? new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
    }).format(balance.availableBalance)
    : null;

  return (
    <div className="flex min-h-dvh flex-col px-4.5 pt-[calc(env(safe-area-inset-top)+1.5rem)] pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
      <ScreenHeader back="/home" title="NGN Account" round />

      {formattedBalance !== null ? (
        <div className="mt-4 rounded-3xl bg-gradient-to-br from-jumpa-primary-700 via-jumpa-primary-800 to-jumpa-primary-950 p-5 text-jumpa-white shadow-lg">
          <span className="text-xs font-medium tracking-wide text-jumpa-white/70 uppercase">
            Available NGN Balance
          </span>
          <div className="mt-1 text-2xl font-bold tracking-tight">
            {formattedBalance}
          </div>
        </div>
      ) : null}

      {/* hide the account details and ahsre details for now */}
      {/* there should be a flow for deposit and withdraw here or top up */}
      {/* TODO figure this out  */}
      {/* <div className="mt-4">
        <SettingSection label="Account Details">
          <SettingCard className="pb-4">
            {fields.map((field, index) => (
              <Fragment key={field.label}>
                <SettingRow
                  icon={TagsIcon}
                  label={field.label}
                  value={field.value}
                  action={
                    <CopyButton
                      value={field.value}
                      name={`Copy ${field.label.toLowerCase()}`}
                    />
                  }
                />
                {index < fields.length - 1 ? <SettingRule /> : null}
              </Fragment>
            ))}
          </SettingCard>
        </SettingSection>
      </div> */}

      {/* <div className="mt-10">
        <ShareDetailsButton text={shareText} />
      </div> */}
    </div>
  );
}
