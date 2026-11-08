"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronRightIcon } from "@/components/ui/icons/chevron-right";
import { EyeOffIcon } from "@/components/ui/icons/eye-off";
import { SOON, SoonTag } from "@/components/ui/soon-tag";
import { useKyc } from "@/hooks/use-kyc";
import { onNgnRefresh, onBalanceRefresh } from "@/lib/client-events";
import { cn } from "@/lib/cn";
import { FIAT_ACCOUNTS, type FiatAccount } from "@/lib/wallet";
import { FiatBalance } from "./fiat-balance";
import { KycRequiredModal } from "./kyc-required-modal";

/** Each currency has its own opening flow. */
const CREATE: Record<FiatAccount["id"], string> = {
  ngn: "/ngn-account",
  usd: "/usd-account",
};

/** A funded account opens the details money is sent to. */
const DETAILS: Record<FiatAccount["id"], string> = {
  ngn: "/ngn-account?view=details",
  usd: "/usd-account?view=details",
};

// In-memory cache for instant zero-flicker tab returns
let ngnMemoryCache: { hasAccount?: boolean; balance?: string | null } = {};

interface FiatAccountsProps {
  variant?: FiatCardVariant;
  /** Hangs the "More accounts" tag off the last card (Home only). */
  moreAccounts?: boolean;
  initialHasNgnAccount?: boolean;
  initialNgnBalance?: string | null;
  initialKycComplete?: boolean;
}

/** The NGN and USD balances, side by side under the quick actions. */
export function FiatAccounts({
  variant = "plain",
  moreAccounts = false,
  initialHasNgnAccount,
  initialNgnBalance,
  initialKycComplete,
}: FiatAccountsProps = {}) {
  const { isKycComplete } = useKyc(initialKycComplete);
  const [showKycModal, setShowKycModal] = useState(false);

  const [hasNgnAccount, setHasNgnAccount] = useState<boolean>(() => {
    if (initialHasNgnAccount !== undefined) return initialHasNgnAccount;
    return ngnMemoryCache.hasAccount ?? false;
  });
  const [ngnBalance, setNgnBalance] = useState<string | null>(() => {
    if (initialNgnBalance !== undefined) return initialNgnBalance;
    return ngnMemoryCache.balance ?? null;
  });

  // Keep state in sync if parent passes fresh server props
  useEffect(() => {
    if (initialHasNgnAccount !== undefined) {
      setHasNgnAccount(initialHasNgnAccount);
      ngnMemoryCache.hasAccount = initialHasNgnAccount;
    }
    if (initialNgnBalance !== undefined) {
      setNgnBalance(initialNgnBalance);
      ngnMemoryCache.balance = initialNgnBalance;
    }
  }, [initialHasNgnAccount, initialNgnBalance]);

  // Fetch live NGN account status and balance from API in background (stale-while-revalidate)
  useEffect(() => {
    let isMounted = true;
    let lastFetchTime = 0;

    async function loadNgnAccount() {
      try {
        const res = await fetch("/api/v1/ngn-account", {
          cache: "no-store",
        });

        if (!res.ok) {
          if (res.status === 404 && isMounted) {
            setHasNgnAccount(false);
            setNgnBalance(null);
            ngnMemoryCache = { hasAccount: false, balance: null };
            try {
              localStorage.setItem(
                "jumpa_ngn_account_cache",
                JSON.stringify({ hasAccount: false, balance: null }),
              );
            } catch {}
          }
          return;
        }

        const data = await res.json();
        if (isMounted && data.hasAccount) {
          const rawBal = Number(data.balance?.availableBalance ?? 0);
          const formatted = `₦${rawBal.toLocaleString("en-NG", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`;
          setHasNgnAccount(true);
          setNgnBalance(formatted);
          ngnMemoryCache = { hasAccount: true, balance: formatted };
          try {
            localStorage.setItem(
              "jumpa_ngn_account_cache",
              JSON.stringify({ hasAccount: true, balance: formatted }),
            );
          } catch {}
        } else if (isMounted) {
          setHasNgnAccount(false);
          setNgnBalance(null);
          ngnMemoryCache = { hasAccount: false, balance: null };
          try {
            localStorage.setItem(
              "jumpa_ngn_account_cache",
              JSON.stringify({ hasAccount: false, balance: null }),
            );
          } catch {}
        }
      } catch (err) {
        console.warn("[FiatAccounts] Failed to fetch NGN account status:", err);
      }
    }

    // Initial background revalidation on mount
    const hasInitialData = initialHasNgnAccount !== undefined;
    if (!hasInitialData) {
      loadNgnAccount();
    }
    lastFetchTime = Date.now();

    // Revalidate on global balance/ngn events
    const unsubNgn = onNgnRefresh(() => {
      loadNgnAccount();
    });
    const unsubBal = onBalanceRefresh(() => {
      loadNgnAccount();
    });

    // Revalidate on tab focus or visibility change (e.g. user returns from banking app)
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        const now = Date.now();
        if (now - lastFetchTime > 3000) {
          lastFetchTime = now;
          loadNgnAccount();
        }
      }
    };

    window.addEventListener("focus", handleVisibility);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      isMounted = false;
      unsubNgn();
      unsubBal();
      window.removeEventListener("focus", handleVisibility);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  const accounts: FiatAccount[] = FIAT_ACCOUNTS.map((account) => {
    if (account.id === "ngn") {
      return {
        ...account,
        balance: hasNgnAccount ? (ngnBalance ?? "₦0.00") : null,
      };
    }
    // USD remains unopened with balance: null
    return account;
  });

  return (
    <>
      <ul className="flex items-stretch gap-2">
        {accounts.map((account, index) => (
          <li key={account.id} className="relative flex flex-1">
            <AccountCard
              account={account}
              variant={variant}
              isKycComplete={isKycComplete}
              onOpenKycModal={() => setShowKycModal(true)}
            />
            {moreAccounts && index === accounts.length - 1 ? (
              <Link
                prefetch
                href="/accounts"
                className="tap absolute -top-2.75 -right-0.75 z-10 flex h-4.25 w-17.25 items-center justify-center rounded-pill bg-jumpa-neutral-50/70 text-[8px] leading-none font-medium tracking-jumpa-snug text-jumpa-black shadow-jumpa-glass active:scale-95"
              >
                More accounts
              </Link>
            ) : null}
          </li>
        ))}
      </ul>

      {showKycModal && (
        <KycRequiredModal onClose={() => setShowKycModal(false)} />
      )}
    </>
  );
}

/**
 * USD accounts are not issued yet at the client's ask. The opening flow is
 * built and untouched — drop this constant to put the card back in service.
 */
const NOT_LIVE: FiatAccount["id"][] = ["usd"];

/** Home tints each card by currency; the deposit lists keep them plain. */
const CARD = {
  home: {
    shell: "h-19.5 pt-2.25",
    gap: "gap-2.25",
    chevron: "top-7.75 text-jumpa-neutral-425",
  },
  plain: {
    shell: "py-2.5",
    gap: "gap-4",
    chevron: "top-1/2 -translate-y-1/2 text-jumpa-black",
  },
} as const;

const AVAILABLE = "text-[8px] leading-2.5 font-medium text-jumpa-neutral-425";

const CREATE_PILL =
  "tap flex h-8.25 items-center justify-center rounded-pill bg-jumpa-white text-[10px] font-medium text-jumpa-primary-600 active:scale-95";

const TINT: Record<FiatAccount["id"], string> = {
  ngn: "bg-linear-279 from-jumpa-green-100 from-7% to-jumpa-green-50 to-78%",
  usd: "bg-linear-281 from-jumpa-blue-100 from-2% to-jumpa-blue-50 to-83%",
};

export type FiatCardVariant = keyof typeof CARD;

function shellOf(account: FiatAccount, variant: FiatCardVariant) {
  return cn(
    "relative flex flex-1 flex-col rounded-panel px-4",
    CARD[variant].shell,
    CARD[variant].gap,
    variant === "home" ? TINT[account.id] : "bg-jumpa-neutral-50",
  );
}

function CardHeading({ account }: { account: FiatAccount }) {
  return (
    <span className="flex items-center gap-1">
      <Image
        src={account.flag}
        alt=""
        width={64}
        height={64}
        className="size-4 rounded-full object-contain"
      />
      <span className="text-[10px] leading-4 font-medium tracking-jumpa-snug text-jumpa-black">
        {account.label}
      </span>
    </span>
  );
}

function CardChevron({ variant }: { variant: FiatCardVariant }) {
  return (
    <ChevronRightIcon
      className={cn("absolute right-2.5 size-5", CARD[variant].chevron)}
    />
  );
}

/** Zero shown on a muted card; neither is a real balance. */
const SOON_FIGURE: Record<FiatAccount["id"], string> = {
  ngn: "₦0.00",
  usd: "$0.00",
};

/** An account not open to this user yet: laid out like a live card, then muted; the tag sits outside the blur. */
function SoonAccountCard({
  account,
  variant,
}: {
  account: FiatAccount;
  variant: FiatCardVariant;
}) {
  return (
    <>
      <div aria-disabled="true" className={cn(shellOf(account, variant), SOON)}>
        <CardHeading account={account} />
        <span className="flex flex-col">
          <span className={AVAILABLE}>Available</span>
          <span className="flex items-center gap-2 text-jumpa-black">
            {/* Placeholder figure: there is no balance until the account goes live. */}
            <span className="text-base leading-5.25 font-semibold">
              {SOON_FIGURE[account.id]}
            </span>
            <EyeOffIcon className="size-4" />
          </span>
        </span>
        <CardChevron variant={variant} />
        <span className="sr-only">(coming soon)</span>
      </div>
      <SoonTag className="top-2 right-2.5" />
    </>
  );
}

/** Both accounts muted and tagged Soon, for the Nimiq mini app, which has no Jumpa account behind it. */
export function SoonFiatAccounts() {
  return (
    <ul className="flex items-stretch gap-2">
      {FIAT_ACCOUNTS.map((account) => (
        <li key={account.id} className="relative flex flex-1">
          <SoonAccountCard account={account} variant="home" />
        </li>
      ))}
    </ul>
  );
}

function AccountCard({
  account,
  variant,
  isKycComplete,
  onOpenKycModal,
}: {
  account: FiatAccount;
  variant: FiatCardVariant;
  isKycComplete: boolean;
  onOpenKycModal: () => void;
}) {
  const shell = shellOf(account, variant);
  const heading = <CardHeading account={account} />;
  const chevron = <CardChevron variant={variant} />;

  if (NOT_LIVE.includes(account.id)) {
    return <SoonAccountCard account={account} variant={variant} />;
  }

  if (account.balance !== null) {
    return (
      <Link
        prefetch
        href={DETAILS[account.id]}
        aria-label={`Open your ${account.label}`}
        className={cn(shell, "transition-transform active:scale-[0.99]")}
      >
        {heading}
        <span className="flex flex-col">
          <span className={AVAILABLE}>Available</span>
          <FiatBalance amount={account.balance} label={account.label} />
        </span>
        {chevron}
      </Link>
    );
  }

  return (
    <div className={shell}>
      {heading}
      {account.id === "ngn" && !isKycComplete ? (
        <button type="button" onClick={onOpenKycModal} className={CREATE_PILL}>
          Create Account
        </button>
      ) : (
        <Link prefetch href={CREATE[account.id]} className={CREATE_PILL}>
          Create Account
        </Link>
      )}
    </div>
  );
}
