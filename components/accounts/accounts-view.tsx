"use client";

import Image from "next/image";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { useState } from "react";
import { KycRequiredModal } from "@/components/home/kyc-required-modal";
import { ChevronRightIcon } from "@/components/ui/icons/chevron-right";
import { ScreenHeader } from "@/components/ui/screen-header";
import { SOON, SoonTag } from "@/components/ui/soon-tag";
import { useKyc } from "@/hooks/use-kyc";
import { useNgnAccount } from "@/hooks/use-ngn-account";
import { cn } from "@/lib/cn";
import { FLAGS } from "@/lib/flags";

type Currency = {
  code: string;
  name: string;
  symbol: string;
  flag: string;
  /** What the account is for, under the name. */
  pitch: string;
  /** Card wash, one per currency. */
  tint: string;
};

const NAIRA: Currency = {
  code: "NGN",
  name: "Nigerian Naira",
  symbol: "₦",
  flag: FLAGS.NG,
  pitch: "Receive bank transfers in naira",
  tint: "bg-linear-279 from-jumpa-green-100 from-7% to-jumpa-green-50 to-78%",
};

/** On the roadmap: shown muted and tagged until each one goes live. */
const UPCOMING: Currency[] = [
  {
    code: "USD",
    name: "US Dollar",
    symbol: "$",
    flag: FLAGS.US,
    pitch: "Get paid from abroad",
    tint: "bg-linear-281 from-jumpa-blue-100 from-2% to-jumpa-blue-50 to-83%",
  },
  {
    code: "GHS",
    name: "Ghanaian Cedi",
    symbol: "₵",
    flag: FLAGS.GH,
    pitch: "Pay and get paid in Ghana",
    tint: "bg-linear-279 from-jumpa-warm-100 from-7% to-jumpa-warm-50 to-78%",
  },
  {
    code: "KES",
    name: "Kenyan Shilling",
    symbol: "KSh",
    flag: FLAGS.KE,
    pitch: "Pay and get paid in Kenya",
    tint: "bg-linear-279 from-jumpa-lilac-150 from-7% to-jumpa-lilac-50 to-78%",
  },
  {
    code: "ZAR",
    name: "South African Rand",
    symbol: "R",
    flag: FLAGS.ZA,
    pitch: "Pay and get paid in South Africa",
    tint: "bg-linear-279 from-jumpa-alt-100 from-7% to-jumpa-alt-50 to-78%",
  },
];

const FLAG_STACK = [NAIRA, ...UPCOMING].map(({ code, flag }) => ({
  code,
  flag,
}));

const CREATE_PILL =
  "tap flex h-8.25 shrink-0 items-center rounded-pill bg-jumpa-white px-3.5 text-[10px] font-medium text-jumpa-primary-600 active:scale-95";

/** Staggered entrance; `at(n)` sets each block's place in the line. */
const RISE = "animate-rise stagger";
const at = (index: number) => ({ "--i": index }) as CSSProperties;

/** "More accounts": the live naira account up top, every currency on the way below. */
export function AccountsView({
  initialHasAccount,
  initialBalance,
}: {
  /** Seeded on the server so the first paint matches it; the hook revalidates. */
  initialHasAccount: boolean;
  initialBalance: string | null;
}) {
  const { hasNgnAccount, ngnBalance } = useNgnAccount(initialHasAccount);
  const { isKycComplete } = useKyc();
  const [showKycModal, setShowKycModal] = useState(false);

  return (
    <div className="flex flex-col px-4.5 pt-[calc(env(safe-area-inset-top)+0.875rem)] pb-10">
      <ScreenHeader back="/home" title="Accounts" />

      <div className={RISE} style={at(0)}>
        <Hero />
      </div>

      <section className={cn("mt-7", RISE)} style={at(1)}>
        <h2 className="text-sm leading-4.5 font-medium text-jumpa-black">
          Your account
        </h2>
        <div className="mt-2.5">
          {hasNgnAccount ? (
            <Link
              prefetch
              href="/ngn-account?view=details"
              aria-label="Open your NGN account"
              className="block transition-transform active:scale-[0.99]"
            >
              <CurrencyCard currency={NAIRA}>
                <span className="flex items-center gap-1 text-right">
                  <span className="flex flex-col">
                    <span className="text-[8px] leading-2.5 font-medium text-jumpa-neutral-425">
                      Available
                    </span>
                    <span className="text-base leading-5.25 font-semibold text-jumpa-black">
                      {ngnBalance ?? initialBalance ?? "₦0.00"}
                    </span>
                  </span>
                  <ChevronRightIcon className="size-5 text-jumpa-black" />
                </span>
              </CurrencyCard>
            </Link>
          ) : (
            <CurrencyCard currency={NAIRA}>
              {isKycComplete ? (
                <Link prefetch href="/ngn-account" className={CREATE_PILL}>
                  Create account
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowKycModal(true)}
                  className={CREATE_PILL}
                >
                  Create account
                </button>
              )}
            </CurrencyCard>
          )}
        </div>
      </section>

      <section className="mt-7">
        <h2
          className={cn(
            "text-sm leading-4.5 font-medium text-jumpa-black",
            RISE,
          )}
          style={at(2)}
        >
          Landing soon
        </h2>
        <ul className="mt-2.5 flex flex-col gap-3">
          {UPCOMING.map((currency, index) => (
            <li key={currency.code} className={RISE} style={at(index + 3)}>
              <div className="relative">
                <div aria-disabled="true" className={SOON}>
                  <CurrencyCard currency={currency}>
                    <span className="rounded-pill bg-jumpa-white/70 px-2.5 py-1 text-[10px] leading-3 font-semibold tracking-jumpa-wide text-jumpa-black">
                      {currency.code}
                    </span>
                  </CurrencyCard>
                  <span className="sr-only">(coming soon)</span>
                </div>
                <SoonTag className="top-2 right-3" />
              </div>
            </li>
          ))}
        </ul>
      </section>

      {showKycModal ? (
        <KycRequiredModal onClose={() => setShowKycModal(false)} />
      ) : null}
    </div>
  );
}

/** The purple banner: every flag we serve, landing one after another. */
function Hero() {
  return (
    <div className="relative isolate mt-3.25 overflow-hidden rounded-row bg-jumpa-primary-600 px-5 pt-5 pb-5.5">
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
          src="/images/home/card-swirl.svg"
          alt=""
          width={225}
          height={150}
          className="absolute top-10 -right-18 max-w-none rotate-[10.54deg]"
        />
        <Image
          src="/images/home/card-orb.svg"
          alt=""
          width={139}
          height={139}
          className="absolute top-6 -left-4.5 max-w-none -rotate-[41.32deg]"
        />
      </div>

      <ul aria-hidden="true" className="flex">
        {FLAG_STACK.map(({ code, flag }, index) => (
          <li
            key={code}
            className="-ml-2 animate-land stagger first:ml-0"
            style={{ "--i": index + 2 } as CSSProperties}
          >
            <Image
              src={flag}
              alt=""
              width={64}
              height={64}
              className="size-9 rounded-full object-cover ring-2 ring-jumpa-primary-600"
            />
          </li>
        ))}
      </ul>

      <p className="mt-4 text-[22px] leading-6.5 font-semibold tracking-jumpa-snug text-jumpa-white">
        Local accounts, <span className="text-jumpa-alt-400">one wallet</span>
      </p>
      <p className="mt-1.5 max-w-60 text-xs leading-4 tracking-jumpa-snug text-jumpa-white/80">
        Bank like a local in naira today. More currencies are on their way.
      </p>
    </div>
  );
}

/** A tinted currency card: flag, name and pitch, the trailing control, and a big faint symbol behind. */
function CurrencyCard({
  currency: { name, symbol, flag, pitch, tint },
  children,
}: {
  currency: Currency;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "relative isolate flex h-21 items-center gap-3 overflow-hidden rounded-row px-4",
        tint,
      )}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-3 -bottom-8 -z-10 -rotate-12 text-[88px] leading-none font-bold text-jumpa-black/5 select-none"
      >
        {symbol}
      </span>
      <Image
        src={flag}
        alt=""
        width={64}
        height={64}
        className="size-10 shrink-0 rounded-full object-cover"
      />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-sm leading-4.5 font-semibold tracking-jumpa-snug text-jumpa-black">
          {name}
        </span>
        <span className="truncate text-[10px] leading-3 tracking-jumpa-snug text-jumpa-neutral-475">
          {pitch}
        </span>
      </span>
      {children}
    </div>
  );
}
