"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import { OptionRow } from "@/components/transfer/option-row";
import { FieldError } from "@/components/ui/field-error";
import { MoneyInsertIcon } from "@/components/ui/icons/money-insert";
import { MoneyWithdrawalIcon } from "@/components/ui/icons/money-withdrawal";
import { RefreshCwIcon } from "@/components/ui/icons/refresh-cw";
import { cn } from "@/lib/cn";
import { formatStable } from "@/lib/naira-deposit";
import type { AccountSummary } from "@/lib/nimiq/orders";
import { SUPPORT_EMAIL } from "@/lib/support";
import { formatUsd } from "@/lib/token-amount";
import { shortenAddress } from "@/lib/transfer";
import type { FlowName } from "./use-mini-app-nav";

/** Frosted chip over the purple card, as on the main home screen. */
const GLASS = "bg-jumpa-white/5 inset-ring inset-ring-jumpa-white/35";

/** The mini app's start: wallet, USDT balance, today's limit and the two flows. */
export function NimiqHome({
  address,
  account,
  accountError,
  loading,
  onRefresh,
  onOpen,
  activity,
}: {
  address: string;
  account?: AccountSummary;
  accountError?: string;
  loading: boolean;
  onRefresh: () => void;
  onOpen: (flow: FlowName) => void;
  /** Orders still moving and recent history, under the actions. */
  activity?: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col px-4.5 pt-[calc(env(safe-area-inset-top)+1.5rem)] pb-[calc(env(safe-area-inset-bottom)+2rem)]">
      <header className="flex h-11 items-center justify-between">
        <Image
          src="/logo/wordmark/purple.png"
          alt="Jumpa"
          width={384}
          height={80}
          priority
          className="h-5.25 w-24"
        />
        <span className="flex h-8 items-center gap-1.5 rounded-pill bg-jumpa-primary-50 pr-3 pl-1.5 text-xs leading-4 font-medium text-jumpa-primary-950">
          <Image
            src="/coins/pol.webp"
            alt="Polygon"
            width={20}
            height={20}
            className="size-5 rounded-full"
          />
          {shortenAddress(address, 6, 4)}
        </span>
      </header>

      <section className="relative isolate mt-6 overflow-hidden rounded-row bg-jumpa-primary-600 px-5 pt-4.75 pb-5">
        <CardArt />

        <span
          className={cn(
            "flex h-7 w-fit items-center gap-1.5 rounded-pill pr-3 pl-1 text-xs leading-2.5 font-medium tracking-jumpa-snug text-jumpa-white",
            GLASS,
          )}
        >
          <Image
            src="/coins/usdt.webp"
            alt=""
            width={20}
            height={20}
            className="size-5 rounded-full"
          />
          USDT on Polygon
        </span>

        <p className="mt-3 flex items-baseline gap-1.5 text-jumpa-white">
          <span className="text-3xl leading-9 font-semibold tracking-jumpa-snug">
            {account ? formatStable(account.usdtBalance) : "—"}
          </span>
          <span className="text-base leading-5 font-medium text-jumpa-alt-400">
            USDT
          </span>
        </p>

        <p className="mt-1 text-xs leading-4 text-jumpa-white/75">
          {account
            ? `${formatUsd(account.remainingTodayUsd)} left of today's ${formatUsd(account.limits.dailyUsd)} limit`
            : loading
              ? "Checking your balance…"
              : "Balance unavailable"}
        </p>

        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          aria-label="Refresh balance"
          className={cn(
            "tap absolute top-4 right-4.25 flex size-8.25 items-center justify-center rounded-pill text-jumpa-white active:scale-95",
            GLASS,
          )}
        >
          <RefreshCwIcon
            className={cn("size-4.75", loading && "animate-spin")}
          />
        </button>
      </section>

      {accountError ? (
        <div className="mt-3">
          <FieldError>{accountError}</FieldError>
        </div>
      ) : null}

      <h2 className="mt-8 text-sm leading-4 font-semibold text-jumpa-black">
        What would you like to do?
      </h2>
      <div className="mt-4 flex flex-col gap-5">
        <OptionRow
          Icon={MoneyWithdrawalIcon}
          title="Cash out to bank"
          caption="USDT to any Nigerian bank. Jumpa pays the gas."
          onClick={() => onOpen("cash-out")}
        />
        <OptionRow
          Icon={MoneyInsertIcon}
          title="Top up with Naira"
          caption="Pay by bank transfer, get USDT."
          onClick={() => onOpen("top-up")}
        />
      </div>

      {activity}

      <p className="mt-auto pt-8 text-center text-xs leading-4 text-jumpa-neutral-400">
        Need help?{" "}
        <a
          href={`mailto:${SUPPORT_EMAIL}`}
          className="font-medium text-jumpa-primary-600"
        >
          {SUPPORT_EMAIL}
        </a>
      </p>
    </div>
  );
}

/** The home card's swirl and orb, behind the balance. */
function CardArt() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-10"
    >
      <Image
        src="/images/home/card-swirl.svg"
        alt=""
        width={225}
        height={150}
        className="absolute top-0 -right-12 max-w-none -rotate-[8.67deg]"
      />
      <Image
        src="/images/home/card-orb.svg"
        alt=""
        width={139}
        height={139}
        className="absolute top-3.25 -left-4.5 max-w-none -rotate-[41.32deg]"
      />
    </div>
  );
}
