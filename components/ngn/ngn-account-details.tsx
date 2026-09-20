"use client";

import { Fragment, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ScreenHeader } from "@/components/ui/screen-header";
import { Button } from "@/components/ui/button";
import { JumpaLoader } from "@/components/ui/jumpa-loader";
import { BankIcon } from "@/components/ui/icons/bank";
import { ArrowDownRightIcon } from "@/components/ui/icons/arrow-down-right";
import { ArrowUpRightIcon } from "@/components/ui/icons/arrow-up-right";
import { EyeIcon } from "@/components/ui/icons/eye";
import { EyeOffIcon } from "@/components/ui/icons/eye-off";
import { NairaSignIcon } from "@/components/ui/icons/naira-sign";
import { CopyButton } from "@/components/auth/copy-button";
import { SettingRow } from "@/components/settings/setting-row";
import {
  SettingCard,
  SettingRule,
  SettingSection,
} from "@/components/settings/setting-section";
import { TagsIcon } from "@/components/ui/icons/tags";
import { ShareDetailsButton } from "@/components/ngn/share-details-button";
import { TransactionEmpty } from "@/components/transactions/transaction-empty";
import {
  TransactionRow,
  TransactionRule,
} from "@/components/transactions/transaction-row";
import type { Transaction } from "@/lib/wallet";

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

const MASK = "*".repeat(9);
const ACTION = "tap flex w-16 flex-col items-center gap-2 active:scale-95";

/** Upgraded NGN account details screen with balance card, action buttons, and live NGN transaction history. */
export function NgnAccountDetails() {
  const [loading, setLoading] = useState(true);
  const [account, setAccount] = useState<NgnAccountData | null>(null);
  const [balance, setBalance] = useState<NgnBalanceData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [visible, setVisible] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(true);

  // Sync visibility state from localStorage
  useEffect(() => {
    try {
      const savedVisible = localStorage.getItem("jumpa_balance_visible");
      if (savedVisible !== null) {
        setVisible(savedVisible === "true");
      }
    } catch {}
  }, []);

  // Fetch account and balance
  useEffect(() => {
    let isMounted = true;
    async function fetchAccount() {
      try {
        console.log("Fetching NGN account details...");
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
          if (data.balance) {
            setBalance(data.balance);
          }
        }
      } catch (err: any) {
        console.error("Error fetching details:", err);
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

  // Fetch NGN-specific transaction history
  useEffect(() => {
    let isMounted = true;
    async function fetchNgnTransactions() {
      try {
        const res = await fetch("/api/transactions?chain=fiat&limit=10");
        if (res.ok && isMounted) {
          const data = await res.json();
          if (Array.isArray(data.transactions)) {
            setTransactions(data.transactions);
          }
        }
      } catch (err) {
        console.warn("Failed to fetch NGN transactions:", err);
      } finally {
        if (isMounted) setLoadingTransactions(false);
      }
    }

    fetchNgnTransactions();
    return () => {
      isMounted = false;
    };
  }, []);

  const ToggleIcon = visible ? EyeOffIcon : EyeIcon;

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

  const formattedBalance = balance
    ? new Intl.NumberFormat("en-NG", {
        style: "currency",
        currency: "NGN",
      }).format(balance.availableBalance)
    : "₦0.00";

  const fields = [
    { label: "Bank Name", value: account.bankName || "Bank" },
    { label: "Account Number", value: account.accountNumber || "---" },
    { label: "Account Name", value: account.accountName || "Jumpa User" },
  ];

  const shareText = fields.map((f) => `${f.label}: ${f.value}`).join("\n");

  const actions = [
    {
      label: "Deposit",
      href: "/receive?rail=fiat",
      Icon: ArrowDownRightIcon,
    },
    {
      label: "Withdraw",
      href: "/send/bank",
      Icon: ArrowUpRightIcon,
    },
  ];

  return (
    <div className="flex min-h-dvh flex-col px-4.5 pt-[calc(env(safe-area-inset-top)+1.5rem)] pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
      <ScreenHeader back="/home" title="NGN Account" round />

      {/* Hero Balance Card */}
      <section className="relative isolate mt-4 flex h-30 flex-col items-center justify-center gap-3 overflow-hidden rounded-key bg-[image:var(--gradient-jumpa-hero)]">
        <Image
          src="/images/home/hero-grid.svg"
          alt=""
          aria-hidden="true"
          width={287}
          height={264}
          className="pointer-events-none absolute -top-8 left-1/2 -z-10 max-w-none -translate-x-1/2"
        />

        <span className="flex items-center gap-1.5 rounded-pill bg-jumpa-white py-1.5 pr-3 pl-2 text-[10px] leading-3 font-bold text-jumpa-primary-950">
          <span className="flex size-4 items-center justify-center rounded-full bg-jumpa-primary-950 text-jumpa-white">
            <NairaSignIcon className="size-2.5" />
          </span>
          NGN BALANCE
        </span>

        <p className="flex items-center gap-2 text-2xl leading-7 font-semibold text-jumpa-white">
          {visible ? formattedBalance : MASK}
          <button
            type="button"
            onClick={() => {
              setVisible((on) => {
                const next = !on;
                try {
                  localStorage.setItem("jumpa_balance_visible", String(next));
                } catch {}
                return next;
              });
            }}
            aria-label={visible ? "Hide balance" : "Show balance"}
            className="tap active:scale-95"
          >
            <ToggleIcon className="size-6" />
          </button>
        </p>
      </section>

      {/* Action Buttons: Deposit & Withdraw */}
      <nav className="mt-6 flex items-start justify-center gap-10">
        {actions.map(({ label, href, Icon }) => (
          <Link key={label} href={href} className={ACTION}>
            <span className="flex size-14 items-center justify-center rounded-full bg-jumpa-primary-50 text-jumpa-primary-600 shadow-sm transition hover:bg-jumpa-primary-100">
              <Icon className="size-6" />
            </span>
            <span className="text-xs leading-4 font-medium text-jumpa-black">
              {label}
            </span>
          </Link>
        ))}
      </nav>

      {/* Dedicated Bank Account Details Card */}
      <div className="mt-6">
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
      </div>

      <div className="mt-4">
        <ShareDetailsButton text={shareText} />
      </div>

      {/* Transaction History specific to Naira Account */}
      <div className="mt-8 flex items-center justify-between text-sm leading-4.5 font-medium text-jumpa-black">
        <h2>Transaction History</h2>
        <Link
          href="/transactions?chain=fiat"
          className="text-jumpa-primary-950 tap active:scale-95"
        >
          See All
        </Link>
      </div>

      {/* `gap-4` is the approved 72px row pitch from the home card — without it
          the rules are `-mb-px` and the rows sit flush against each other. */}
      <div className="mt-3 flex flex-col gap-4 rounded-surface border border-jumpa-neutral-60 bg-jumpa-neutral-50 px-5 py-5">
        {loadingTransactions ? (
          <div className="flex flex-col gap-4 animate-pulse">
            <div className="h-10 w-full rounded-md bg-jumpa-neutral-200/50" />
            <div className="h-10 w-full rounded-md bg-jumpa-neutral-200/50" />
          </div>
        ) : transactions.length === 0 ? (
          <TransactionEmpty />
        ) : (
          transactions.map((transaction, index) => (
            <Fragment key={transaction.id || (transaction as any)._id || index}>
              {index > 0 ? <TransactionRule /> : null}
              {/* No chain mark here — this account only ever holds naira. */}
              <TransactionRow transaction={transaction} badge={false} />
            </Fragment>
          ))
        )}
      </div>
    </div>
  );
}
