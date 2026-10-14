"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CookieIcon } from "@/components/ui/icons/cookie";
import { CloseIcon } from "@/components/ui/icons/close";

const STORAGE_KEY = "jumpa_cookie_choices_dismissed";

export function CookieChoicesBanner() {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);

  useEffect(() => {
    setMounted(true);
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (!dismissed) {
      // Gentle delay so the landing/app can paint first
      const timer = setTimeout(() => setVisible(true), 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  const dismiss = () => {
    setVisible(false);
    setShowPreferences(false);
    try {
      localStorage.setItem(STORAGE_KEY, "true");
    } catch {
      // Ignore in private storage sandbox
    }
  };

  if (!mounted || !visible) return null;

  return (
    <>
      {/* Floating Cookie Choices Card — constrained within the centered app column */}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 mx-auto max-w-app px-4.5 pb-safe md:bottom-6">
        <aside
          aria-label="Cookie Preferences"
          className="pointer-events-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-300 rounded-2xl border border-jumpa-neutral-100 bg-jumpa-white/95 p-4 text-jumpa-black shadow-[0_8px_30px_rgb(0,0,0,0.12)] backdrop-blur-md"
        >
          {/* Header Row: Icon + Jumpa brand title */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-jumpa-primary-50 text-jumpa-primary-600">
                <CookieIcon className="size-4" />
              </span>
              <span className="text-xs font-semibold tracking-wider text-jumpa-black uppercase">
                Jumpa Cookies
              </span>
            </div>

            <span className="rounded-full border border-jumpa-neutral-100 bg-jumpa-neutral-50 px-2 py-0.5 text-[10px] font-medium tracking-wide text-jumpa-grey-500">
              Privacy Notice
            </span>
          </div>

          {/* Description tailored to Jumpa */}
          <p className="mt-2 text-xs leading-[18px] text-jumpa-grey-600">
            Jumpa uses essential cookies to safeguard your wallet session and
            anonymous performance metrics to keep payments fast and reliable.
          </p>

          {/* Policy Links & Preferences trigger */}
          <div className="mt-2.5 flex items-center gap-2 text-[11px] text-jumpa-grey-500">
            <Link
              href="/privacy"
              className="text-jumpa-grey-600 underline decoration-jumpa-neutral-200 underline-offset-3 hover:text-jumpa-primary-600"
            >
              Privacy Policy
            </Link>
            <span>•</span>
            <Link
              href="/terms-of-service"
              className="text-jumpa-grey-600 underline decoration-jumpa-neutral-200 underline-offset-3 hover:text-jumpa-primary-600"
            >
              Terms of Service
            </Link>
            <span>•</span>
            <button
              type="button"
              onClick={() => setShowPreferences(true)}
              className="cursor-pointer text-jumpa-grey-600 underline decoration-jumpa-neutral-200 underline-offset-3 hover:text-jumpa-primary-600"
            >
              Preferences
            </button>
          </div>

          {/* Action Buttons: Reject & Accept All */}
          <div className="mt-3.5 flex items-center gap-2.5">
            <button
              type="button"
              onClick={dismiss}
              className="tap flex-1 rounded-xl border border-jumpa-neutral-200 bg-jumpa-neutral-50 py-2 text-center text-xs font-semibold text-jumpa-black transition hover:bg-jumpa-neutral-100 active:scale-[0.98]"
            >
              Reject
            </button>
            <button
              type="button"
              onClick={dismiss}
              className="tap flex-1 rounded-xl bg-jumpa-primary-600 py-2 text-center text-xs font-semibold text-jumpa-white transition hover:bg-jumpa-primary-700 active:scale-[0.98]"
            >
              Accept All
            </button>
          </div>
        </aside>
      </div>

      {/* Preferences Modal (Light theme) */}
      {showPreferences && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-jumpa-black/50 p-4.5 backdrop-blur-sm"
        >
          <div className="relative w-full max-w-app rounded-2xl border border-jumpa-neutral-100 bg-jumpa-white p-5 text-jumpa-black shadow-2xl">
            <div className="flex items-center justify-between border-b border-jumpa-neutral-100 pb-3">
              <h3 className="text-sm font-semibold tracking-wide uppercase">
                Cookie Preferences
              </h3>
              <button
                type="button"
                onClick={() => setShowPreferences(false)}
                className="cursor-pointer rounded-lg p-1 text-jumpa-grey-500 hover:bg-jumpa-neutral-100 hover:text-jumpa-black"
              >
                <CloseIcon className="size-4" />
              </button>
            </div>

            <div className="flex flex-col gap-4 py-4 text-xs">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold text-jumpa-black">Strictly Essential</p>
                  <p className="mt-0.5 text-jumpa-grey-600">
                    Required for end-to-end security, PIN verification, and active
                    session validation.
                  </p>
                </div>
                <span className="shrink-0 rounded bg-jumpa-neutral-100 px-2 py-0.5 text-[11px] font-medium text-jumpa-grey-600">
                  Always Active
                </span>
              </div>

              <div className="flex items-start justify-between gap-4 border-t border-jumpa-neutral-100 pt-3">
                <div>
                  <p className="font-semibold text-jumpa-black">Performance & Analytics</p>
                  <p className="mt-0.5 text-jumpa-grey-600">
                    Anonymous telemetry used to diagnose network delays and enhance
                    cross-chain transactions.
                  </p>
                </div>
                <input
                  type="checkbox"
                  defaultChecked
                  className="size-4 cursor-pointer accent-jumpa-primary-600"
                />
              </div>
            </div>

            <div className="mt-2 flex justify-end gap-2 border-t border-jumpa-neutral-100 pt-3">
              <button
                type="button"
                onClick={dismiss}
                className="cursor-pointer rounded-xl bg-jumpa-primary-600 px-5 py-2 text-xs font-semibold text-jumpa-white hover:bg-jumpa-primary-700 active:scale-[0.98]"
              >
                Save Preferences
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
