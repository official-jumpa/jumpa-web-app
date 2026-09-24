"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { ChevronRightIcon } from "@/components/ui/icons/chevron-right";
import { UserAlt1Icon } from "@/components/ui/icons/user-alt-1";
import { useKyc } from "@/hooks/use-kyc";
import { onNgnRefresh, onBalanceRefresh } from "@/lib/client-events";
import { cn } from "@/lib/cn";
import { FIAT_ACCOUNTS, type FiatAccount } from "@/lib/wallet";
import { FiatBalance } from "./fiat-balance";

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
  initialHasNgnAccount?: boolean;
  initialNgnBalance?: string | null;
  initialKycComplete?: boolean;
}

/** The NGN and USD balances, side by side under the quick actions. */
export function FiatAccounts({
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

  // Restore cached NGN account info from localStorage if not provided
  useEffect(() => {
    if (initialHasNgnAccount !== undefined) return;
    try {
      const cached = localStorage.getItem("jumpa_ngn_account_cache");
      if (cached && ngnMemoryCache.hasAccount === undefined) {
        const parsed = JSON.parse(cached);
        if (parsed && typeof parsed.hasAccount === "boolean") {
          setHasNgnAccount(parsed.hasAccount);
          setNgnBalance(parsed.balance ?? null);
          ngnMemoryCache = parsed;
        }
      }
    } catch {}
  }, [initialHasNgnAccount]);

  // Fetch live NGN account status and balance from API in background (stale-while-revalidate)
  useEffect(() => {
    let isMounted = true;
    let lastFetchTime = 0;

    async function loadNgnAccount() {
      try {
        const res = await fetch("/api/ngn-account", {
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
    loadNgnAccount();
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
        {accounts.map((account) => (
          <li key={account.id} className="flex flex-1">
            <AccountCard
              account={account}
              isKycComplete={isKycComplete}
              onOpenKycModal={() => setShowKycModal(true)}
            />
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

/** Muted, not recoloured — the same treatment as the Invest quick action. */
const SOON = "opacity-50 blur-[0.4px]";

function AccountCard({
  account,
  isKycComplete,
  onOpenKycModal,
}: {
  account: FiatAccount;
  isKycComplete: boolean;
  onOpenKycModal: () => void;
}) {
  const soon = NOT_LIVE.includes(account.id);

  if (account.balance !== null) {
    return (
      <Link
        prefetch
        href={DETAILS[account.id]}
        aria-label={`Open your ${account.label}`}
        className="relative flex flex-1 flex-col gap-4 rounded-panel bg-jumpa-neutral-50 px-4 py-2.5 transition-colors hover:bg-jumpa-neutral-100/70 active:scale-[0.99]"
      >
        <span className="flex items-center gap-1">
          <Image
            src={account.flag}
            alt=""
            width={64}
            height={64}
            className="size-4 rounded-full object-contain"
          />
          <span className="text-[10px] font-medium text-jumpa-black">
            {account.label}
          </span>
        </span>

        <span className="flex flex-col">
          <span className="text-[8px] leading-2.5 font-medium text-jumpa-neutral-425">
            Available
          </span>
          <FiatBalance amount={account.balance} label={account.label} />
        </span>

        <span className="absolute inset-y-0 right-0 flex w-9 items-center justify-end pr-2.375 text-jumpa-black">
          <ChevronRightIcon className="size-5" />
        </span>
      </Link>
    );
  }

  return (
    <div className="relative flex flex-1 flex-col gap-4 rounded-panel bg-jumpa-neutral-50 px-4 py-2.5">
      {/* Muted on the contents, not the card — the panel has its own fill, and
          fading that washes it out against the white page. */}
      <span className={cn("flex items-center gap-1", soon && SOON)}>
        <Image
          src={account.flag}
          alt=""
          width={64}
          height={64}
          className="size-4 rounded-full object-contain"
        />
        <span className="text-[10px] font-medium text-jumpa-black">
          {account.label}
        </span>
      </span>

      {soon ? (
        <span
          className={cn(
            "flex h-8.25 cursor-not-allowed items-center justify-center rounded-pill bg-jumpa-white text-[10px] font-medium text-jumpa-primary-600 select-none",
            SOON,
          )}
        >
          Coming soon
        </span>
      ) : account.id === "ngn" && !isKycComplete ? (
        <button
          type="button"
          onClick={onOpenKycModal}
          className="tap flex h-8.25 items-center justify-center rounded-pill bg-jumpa-white text-[10px] font-medium text-jumpa-primary-600 active:scale-95"
        >
          Create Account
        </button>
      ) : (
        <Link
          prefetch
          href={CREATE[account.id]}
          className="tap flex h-8.25 items-center justify-center rounded-pill bg-jumpa-white text-[10px] font-medium text-jumpa-primary-600 active:scale-95"
        >
          Create Account
        </Link>
      )}
    </div>
  );
}

function KycRequiredModal({ onClose }: { onClose: () => void }) {
  return (
    <BottomSheet onClose={onClose} pb="pb-7.5">
      <div className="flex flex-col items-center text-center">
        <span className="flex size-16 items-center justify-center rounded-full bg-jumpa-primary-50 text-jumpa-primary-600">
          <UserAlt1Icon className="size-8" />
        </span>

        <h2 className="mt-4 text-xl leading-6 font-bold text-jumpa-black">
          Identity Verification Required
        </h2>

        <p className="mt-2 text-sm leading-5 text-jumpa-neutral-700">
          To comply with banking regulations and issue your dedicated Naira virtual account, please complete your identity verification (KYC) first.
        </p>

        <Button
          variant="gradientSheet"
          size="lg"
          className="mt-6 font-semibold"
          href="/kyc"
        >
          Complete KYC
        </Button>

        <Button
          size="lg"
          className="mt-2.5 font-semibold text-jumpa-neutral-700"
          onClick={onClose}
        >
          Maybe Later
        </Button>
      </div>
    </BottomSheet>
  );
}
