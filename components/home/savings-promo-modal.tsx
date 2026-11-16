"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useAuthContext } from "@/components/auth/AuthGuard";
import { useAutoLock } from "@/components/auth/auto-lock-provider";
import { STORAGE_KEY as COOKIE_CHOICES_KEY } from "@/components/ui/cookie-choices-banner";
import { CloseIcon } from "@/components/ui/icons/close";
import { useScrollLock } from "@/hooks/use-scroll-lock";

/** Holds the login it was shown for: a new app open or a new sign-in shows it again. */
const SEEN_KEY = "jumpa_savings_promo_seen";
/** Lets Home paint before the pop-up lands. */
const DELAY_MS = 700;
const ART = "/images/promo";

/**
 * Savings pop-up raised on Home once per app open and once per sign-in, after
 * sign-in or unlock and before the saver does anything else. Never opens over
 * the lock screen or the cookie banner.
 */
export function SavingsPromoModal() {
  const { lockScreenShown } = useAutoLock();
  // Every sign-in gets a new session id, whichever way the last one ended.
  const loginId: string | undefined = useAuthContext()?.session?.session?.id;
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (lockScreenShown || !loginId) return;
    try {
      if (sessionStorage.getItem(SEEN_KEY) === loginId) return;
      if (!localStorage.getItem(COOKIE_CHOICES_KEY)) return;
    } catch {
      return;
    }
    const timer = setTimeout(() => {
      try {
        sessionStorage.setItem(SEEN_KEY, loginId);
      } catch {
        // Private mode: it may show again this session, which is harmless.
      }
      setOpen(true);
    }, DELAY_MS);
    return () => clearTimeout(timer);
  }, [lockScreenShown, loginId]);

  if (!open) return null;
  return <PromoDialog onClose={() => setOpen(false)} />;
}

function PromoDialog({ onClose }: { onClose: () => void }) {
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
        aria-label="Put your money to work"
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
        <SavingsPromoCard onStart={onClose} />
      </div>
    </div>,
    document.body,
  );
}

/** The 182×257 artboard. It scales as one piece, so sizes inside read as design px. */
function SavingsPromoCard({ onStart }: { onStart: () => void }) {
  return (
    <div className="frame-182 w-full">
      <div className="relative isolate h-257 w-182 overflow-hidden rounded-u-20 bg-linear-to-b from-jumpa-primary-600 to-jumpa-primary-30 to-[40.392%]">
        <Image
          src={`${ART}/savings-popup-chart.webp`}
          alt=""
          width={2172}
          height={724}
          className="pointer-events-none absolute top-148 -left-54 h-78.75 w-236.25 max-w-none object-cover mix-blend-screen"
        />
        <p className="absolute top-163 left-26 flex h-24 w-136 flex-col justify-center text-center text-u-11.5/16 font-medium tracking-jumpa-snug text-jumpa-primary-975">
          <span>
            Save and earn up to{" "}
            <span className="font-bold text-jumpa-primary-600">15%</span>{" "}
            interest annually.
          </span>
        </p>
        <Image
          src={`${ART}/savings-popup-glow.svg`}
          alt=""
          width={40}
          height={40}
          className="pointer-events-none absolute top-228 -left-4 size-40"
        />
        <Link
          href="/savings"
          onClick={onStart}
          className="tap absolute top-210 left-40 flex h-29 w-106 items-center justify-center rounded-pill bg-jumpa-primary-600 text-u-10.75/10 font-semibold tracking-jumpa-snug whitespace-nowrap text-jumpa-alt-400 active:scale-[0.97]"
        >
          Start Saving
        </Link>
        <Image
          src={`${ART}/savings-popup-piggy.webp`}
          alt=""
          width={1024}
          height={820}
          className="pointer-events-none absolute top-41 -left-9 h-125.25 w-191 max-w-none"
        />
        <span className="pointer-events-none absolute top-18 left-17 flex h-30.5 w-154 items-center justify-center">
          <span className="rotate-[-0.22deg] -skew-x-6 scale-y-99 text-u-12.5/19 font-bold tracking-jumpa-tighter whitespace-nowrap text-jumpa-white">
            Put your money to work!
          </span>
        </span>
        <Image
          src={`${ART}/savings-popup-badge.webp`}
          alt=""
          width={1024}
          height={353}
          className="pointer-events-none absolute top-61 left-59 h-14.25 w-41 max-w-none object-cover"
        />
        <Image
          src={`${ART}/savings-popup-shapes.svg`}
          alt=""
          width={107}
          height={99}
          className="pointer-events-none absolute top-210 left-119 h-99 w-107 max-w-none"
        />
      </div>
    </div>
  );
}
