"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { CopyButton } from "@/components/auth/copy-button";
import { InfoNote } from "@/components/auth/info-note";
import { DetailList, DetailRow } from "@/components/transfer/detail-list";
import { Button } from "@/components/ui/button";
import { BankIcon } from "@/components/ui/icons/bank";
import { ChevronDownIcon } from "@/components/ui/icons/chevron-down";
import { NairaSignIcon } from "@/components/ui/icons/naira-sign";
import { JumpaLoader } from "@/components/ui/jumpa-loader";
import { ScreenHeader } from "@/components/ui/screen-header";
import { ShareDetailsButton } from "@/components/ngn/share-details-button";
import { cn } from "@/lib/cn";

interface NgnAccountData {
  bankName: string;
  accountNumber: string;
  accountName: string;
  status: string;
}

const HERO =
  "relative isolate flex flex-col gap-3 overflow-hidden rounded-key bg-[image:var(--gradient-jumpa-hero)] px-5 py-4.5";
const HERO_LABEL =
  "flex items-center gap-1.5 self-start rounded-pill bg-jumpa-white px-2.5 py-1.5 text-[10px] leading-3 font-bold tracking-jumpa-wide text-jumpa-primary-950 uppercase";
const ACCOUNT_TEXT = "text-2xl leading-8 font-semibold text-jumpa-white tracking-wider font-mono";
const CARD =
  "flex flex-col gap-3 rounded-surface border border-jumpa-neutral-60 bg-jumpa-neutral-50 px-4 py-4";

function HeroGrid() {
  return (
    <Image
      src="/images/home/hero-grid.svg"
      alt=""
      aria-hidden="true"
      width={287}
      height={264}
      className="pointer-events-none absolute -top-10 left-1/2 -z-10 max-w-none -translate-x-1/2 opacity-70"
    />
  );
}

export function FiatDepositView({
  initialAccount = null,
}: {
  initialAccount?: NgnAccountData | null;
} = {}) {
  const [loading, setLoading] = useState(() => !initialAccount);
  const [account, setAccount] = useState<NgnAccountData | null>(initialAccount);
  const [error, setError] = useState<string | null>(null);
  const [showFeeTiers, setShowFeeTiers] = useState(false);

  useEffect(() => {
    if (initialAccount) return;
    let isMounted = true;

    async function loadAccount() {
      try {
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
          setAccount(data.account);
        }
      } catch (err: any) {
        console.error("Failed to fetch NGN deposit account:", err);
        if (isMounted) setError(err.message || "Failed to load account");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadAccount();

    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center px-4.5 pt-[calc(env(safe-area-inset-top)+1.5rem)] pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
        <JumpaLoader />
        <p className="mt-3 text-xs leading-4 font-medium text-jumpa-neutral-400">
          Loading deposit details…
        </p>
      </div>
    );
  }

  if (!account || error) {
    return (
      <div className="flex min-h-dvh flex-col px-4.5 pt-[calc(env(safe-area-inset-top)+1.5rem)] pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
        <ScreenHeader back="/receive" title="Deposit Naira" round />
        <div className="my-auto flex flex-col items-center text-center">
          <span className="flex size-16 items-center justify-center rounded-full bg-jumpa-primary-50 text-jumpa-primary-600">
            <BankIcon className="size-7" />
          </span>
          <h2 className="mt-4 text-base leading-5 font-bold text-jumpa-black">
            No Naira Account Found
          </h2>
          <p className="mt-2 max-w-xs text-sm leading-4.5 font-medium text-jumpa-neutral-400">
            You don't have a dedicated Naira virtual account yet. Create one in seconds to start receiving Naira transfers anytime.
          </p>
          <div className="mt-6 w-full max-w-xs">
            <Button variant="gradient" size="lg" href="/ngn-account">
              Open Naira Account
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const shareText = [
    `Bank Name: ${account.bankName}`,
    `Account Number: ${account.accountNumber}`,
    `Account Name: ${account.accountName}`,
  ].join("\n");

  return (
    <div className="flex min-h-dvh flex-col px-4.5 pt-[calc(env(safe-area-inset-top)+1.5rem)] pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
      <ScreenHeader back="/receive" title="Deposit Naira" round />

      <div className="mt-4 flex flex-1 flex-col gap-4">
        {/* Hero Dedicated Account Card */}
        <section className={HERO}>
          <HeroGrid />

          <span className={HERO_LABEL}>
            <span className="flex size-4 items-center justify-center rounded-full bg-jumpa-primary-950 text-jumpa-white">
              <NairaSignIcon className="size-2.5" />
            </span>
            Account Number
          </span>

          <span className="flex items-center justify-between gap-3">
            <span className={ACCOUNT_TEXT}>{account.accountNumber}</span>
            <CopyButton
              value={account.accountNumber}
              name="Copy account number"
              label="Copy"
            />
          </span>

          <span className="text-xs leading-4 font-medium text-jumpa-white/80">
            {account.bankName} · {account.accountName}
          </span>
        </section>

        {/* Bank Details Summary */}
        <DetailList>
          <DetailRow label="Bank name" value={account.bankName} />
          <DetailRow
            label="Account number"
            value={
              <span className="flex items-center gap-2">
                {account.accountNumber}
                <CopyButton
                  value={account.accountNumber}
                  name="Copy account number"
                  variant="chip"
                  label="Copy"
                />
              </span>
            }
          />
          <DetailRow
            label="Account name"
            value={account.accountName}
            truncate={false}
            rule={false}
          />
        </DetailList>

        <InfoNote tone="brand">
          Transfer any amount from any Nigerian bank app to this account. Your balance updates instantly.
        </InfoNote>

        <div className={CARD}>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-3 text-xs leading-4 font-medium text-jumpa-black">
              <span className="text-jumpa-neutral-400">Deposit fee</span>
              <button
                type="button"
                onClick={() => setShowFeeTiers((prev) => !prev)}
                className="tap flex items-center gap-1 text-jumpa-neutral-500 hover:text-jumpa-black"
                title="View fee schedule"
              >
                <span>From ₦60</span>
                <ChevronDownIcon
                  className={cn(
                    "size-3 text-jumpa-neutral-400 transition-transform duration-200",
                    showFeeTiers && "rotate-180",
                  )}
                />
              </button>
            </div>

            {showFeeTiers && (
              <div className="flex flex-col gap-1.5 rounded-md bg-jumpa-neutral-80/40 p-2.5 text-[11px] leading-3.5 text-jumpa-neutral-400 animate-in fade-in duration-150">
                <div className="flex justify-between">
                  <span>₦0 – ₦4,999</span>
                  <span className="font-semibold text-jumpa-black">₦60</span>
                </div>
                <div className="flex justify-between">
                  <span>₦5,000 – ₦9,999</span>
                  <span className="font-semibold text-jumpa-black">₦100</span>
                </div>
                <div className="flex justify-between">
                  <span>₦10,000 – ₦14,999</span>
                  <span className="font-semibold text-jumpa-black">₦150</span>
                </div>
                <div className="flex justify-between">
                  <span>₦15,000 – ₦24,999</span>
                  <span className="font-semibold text-jumpa-black">₦200</span>
                </div>
                <div className="flex justify-between">
                  <span>₦25,000 and above</span>
                  <span className="font-semibold text-jumpa-black">1.2% (capped at ₦1,000)</span>
                </div>
              </div>
            )}
          </div>
          <span className="-mb-px block h-px w-full bg-jumpa-neutral-95" />
          <p className="flex items-center justify-between gap-3 text-xs leading-4 font-medium text-jumpa-black">
            <span className="text-jumpa-neutral-400">Funding method</span>
            <span>Nigerian bank transfer</span>
          </p>
          <span className="-mb-px block h-px w-full bg-jumpa-neutral-95" />
          <p className="flex items-center justify-between gap-3 text-xs leading-4 font-medium text-jumpa-black">
            <span className="text-jumpa-neutral-400">Arrives</span>
            <span>Instantly</span>
          </p>
        </div>

        <div className="mt-auto flex flex-col gap-3 pt-4">
          <ShareDetailsButton text={shareText} />

          <Link
            prefetch
            href="/ngn-account?view=details"
            className="tap py-2 text-center text-xs leading-4 font-semibold text-jumpa-primary-600 active:scale-95"
          >
            View Balance & Details
          </Link>
        </div>
      </div>
    </div>
  );
}
