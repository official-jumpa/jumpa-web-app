"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { PlusIcon } from "@/components/ui/icons/plus";
import { ShareArrowIcon } from "@/components/ui/icons/share-arrow";
import { XmarkIcon } from "@/components/ui/icons/xmark";

/**
 * The install nudge. Chromium hands us its own install flow through
 * `beforeinstallprompt`, which we hold on to and fire from our own button;
 * iOS Safari never fires it and has no API at all, so there it is instructions.
 * Any other browser gets nothing — an Install button that cannot install is
 * worse than no card.
 *
 * It renders outside `<main>` so it sits in the app's own spacing, not the
 * landing frame's scaled unit.
 */

/** Not in lib.dom yet — Chromium only. */
type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type Mode = "prompt" | "ios";

const DISMISS_KEY = "jumpa_install_dismissed";
/** Dismissing hides it for a week rather than for good. */
const DISMISS_DAYS = 7;
/** Let the page land before asking for anything. */
const SHOW_DELAY_MS = 2400;

function alreadyInstalled(): boolean {
  const standalone = window.matchMedia("(display-mode: standalone)").matches;
  // iOS reports its own flag and does not set `display-mode`.
  const ios = (navigator as { standalone?: boolean }).standalone === true;
  return standalone || ios;
}

function recentlyDismissed(): boolean {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY));
    return Boolean(at) && Date.now() - at < DISMISS_DAYS * 864e5;
  } catch {
    // Private mode and blocked site data both throw on read.
    return false;
  }
}

/** iOS never fires `beforeinstallprompt`, and only Safari can add to the home screen. */
function isIosSafari(): boolean {
  const ua = navigator.userAgent;
  const ios =
    /iPad|iPhone|iPod/.test(ua) ||
    (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  return ios && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
}

export function InstallPrompt() {
  const [mode, setMode] = useState<Mode | null>(null);
  const [ready, setReady] = useState(false);
  const [steps, setSteps] = useState(false);
  const deferred = useRef<InstallEvent | null>(null);

  useEffect(() => {
    if (alreadyInstalled() || recentlyDismissed()) return;

    const capture = (event: Event) => {
      // Holding the event back is what lets our own card own the moment;
      // without this Chrome shows its mini-infobar and we never get to ask.
      event.preventDefault();
      deferred.current = event as InstallEvent;
      setMode("prompt");
    };
    const installed = () => setMode(null);

    window.addEventListener("beforeinstallprompt", capture);
    window.addEventListener("appinstalled", installed);
    if (isIosSafari()) setMode("ios");

    const timer = window.setTimeout(() => setReady(true), SHOW_DELAY_MS);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", capture);
      window.removeEventListener("appinstalled", installed);
    };
  }, []);

  const dismiss = useCallback(() => {
    setMode(null);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // Nothing to do — it simply asks again next visit.
    }
  }, []);

  const install = useCallback(async () => {
    const event = deferred.current;
    if (!event) return;
    // The event is single-use either way, so the card is done once it resolves.
    deferred.current = null;
    await event.prompt();
    const { outcome } = await event.userChoice;
    if (outcome === "accepted") setMode(null);
    else dismiss();
  }, [dismiss]);

  if (!mode || !ready) return null;

  return (
    <div className="pt-safe pointer-events-none fixed inset-x-0 top-0 z-100 flex justify-center px-4">
      <div className="animate-drop-in pointer-events-auto mt-4 w-full max-w-108 rounded-2xl bg-jumpa-neutral-775 p-3.5 shadow-jumpa-card inset-ring inset-ring-jumpa-white/10">
        <div className="flex items-center gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[image:var(--gradient-jumpa-landing)]">
            <Image
              src="/logo/mark/white.png"
              alt=""
              width={803}
              height={381}
              sizes="26px"
              className="h-auto w-6.5"
            />
          </span>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-jumpa-white">
              Install Jumpa
            </p>
            <p className="text-xs leading-4 text-jumpa-neutral-300">
              Add to your home screen for the best experience
            </p>
          </div>

          <button
            type="button"
            onClick={
              mode === "prompt" ? install : () => setSteps((open) => !open)
            }
            className="tap h-9 shrink-0 rounded-pill bg-jumpa-primary-600 px-4 text-xs font-semibold text-jumpa-white active:scale-95"
          >
            {mode === "prompt" ? "Install" : steps ? "Hide" : "How to"}
          </button>

          <button
            type="button"
            onClick={dismiss}
            aria-label="Dismiss install prompt"
            className="tap flex size-7 shrink-0 items-center justify-center rounded-full text-jumpa-neutral-300 hover:bg-jumpa-white/10 hover:text-jumpa-white active:scale-90"
          >
            <XmarkIcon className="size-4" />
          </button>
        </div>

        {mode === "ios" && steps ? (
          <ol className="animate-rise mt-3 flex flex-col gap-2 border-t border-jumpa-white/10 pt-3 text-xs text-jumpa-neutral-300">
            <li className="flex items-center gap-2">
              <ShareArrowIcon className="size-4 shrink-0 text-jumpa-white" />
              Tap the Share button in Safari&apos;s toolbar
            </li>
            <li className="flex items-center gap-2">
              <PlusIcon className="size-4 shrink-0 text-jumpa-white" />
              Choose &ldquo;Add to Home Screen&rdquo;, then Add
            </li>
          </ol>
        ) : null}
      </div>
    </div>
  );
}
