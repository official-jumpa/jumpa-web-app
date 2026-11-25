"use client";

import { type ComponentType, type ReactNode, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useAuthContext } from "@/components/auth/AuthGuard";
import { useAutoLock } from "@/components/auth/auto-lock-provider";
import { ReferPromoCard } from "@/components/home/app-open-promo/refer-promo-card";
import { RewardPromoCard } from "@/components/home/app-open-promo/reward-promo-card";
import { SavingsPromoCard } from "@/components/home/app-open-promo/savings-promo-card";
import { STORAGE_KEY as COOKIE_CHOICES_KEY } from "@/components/ui/cookie-choices-banner";
import { CloseIcon } from "@/components/ui/icons/close";
import { useScrollLock } from "@/hooks/use-scroll-lock";
import type { HomePromo } from "@/lib/home-promos";

/** Holds the login a pop-up was shown for: a new app open or a new sign-in shows one again. */
const SEEN_KEY = "jumpa_promo_seen";
/** The last pop-up shown, so the next open picks a different one. */
const LAST_KEY = "jumpa_promo_last";
/** Lets Home paint before the pop-up lands. */
const DELAY_MS = 700;

const CARDS: Record<
  HomePromo,
  { label: string; Card: ComponentType<{ onStart: () => void }> }
> = {
  savings: { label: "Put your money to work", Card: SavingsPromoCard },
  refer: { label: "Refer friends, earn rewards", Card: ReferPromoCard },
  reward: { label: "Your reward is waiting", Card: RewardPromoCard },
};

/** Random, but never the one shown last time when there is a choice. */
function pickPromo(promos: HomePromo[], last: string | null): HomePromo {
  const pool = promos.length > 1 ? promos.filter((p) => p !== last) : promos;
  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * One pop-up raised on Home per app open and per sign-in, picked from the ones
 * this user qualifies for. Never opens over the lock screen or the cookie banner.
 */
export function AppOpenPromo({ promos }: { promos: HomePromo[] }) {
  const { lockScreenShown } = useAutoLock();
  // Every sign-in gets a new session id, whichever way the last one ended.
  const loginId: string | undefined = useAuthContext()?.session?.session?.id;
  const [shown, setShown] = useState<HomePromo | null>(null);

  useEffect(() => {
    if (lockScreenShown || !loginId || promos.length === 0) return;
    try {
      if (sessionStorage.getItem(SEEN_KEY) === loginId) return;
      if (!localStorage.getItem(COOKIE_CHOICES_KEY)) return;
    } catch {
      return;
    }
    const timer = setTimeout(() => {
      let last: string | null = null;
      try {
        last = localStorage.getItem(LAST_KEY);
      } catch {
        // Unreadable storage only loses the no-repeat rule.
      }
      const promo = pickPromo(promos, last);
      try {
        sessionStorage.setItem(SEEN_KEY, loginId);
        localStorage.setItem(LAST_KEY, promo);
      } catch {
        // Private mode: one may show again this session, which is harmless.
      }
      setShown(promo);
    }, DELAY_MS);
    return () => clearTimeout(timer);
  }, [lockScreenShown, loginId, promos]);

  if (!shown) return null;
  const { label, Card } = CARDS[shown];
  return (
    <PromoDialog label={label} onClose={() => setShown(null)}>
      <Card onStart={() => setShown(null)} />
    </PromoDialog>
  );
}

function PromoDialog({
  label,
  onClose,
  children,
}: {
  label: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useScrollLock(true);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-50 mx-auto flex max-w-app items-center justify-center px-12">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 animate-fade cursor-default bg-jumpa-black/60"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className="relative w-full max-w-75 animate-pop-in"
      >
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="tap absolute -top-11 right-0 flex size-8 items-center justify-center rounded-full bg-jumpa-white/20 text-jumpa-white backdrop-blur-sm active:scale-95"
        >
          <CloseIcon className="size-4" />
        </button>
        {children}
      </div>
    </div>,
    document.body,
  );
}
