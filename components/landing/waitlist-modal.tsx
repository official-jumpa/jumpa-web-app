"use client";

import { type CSSProperties, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { CheckIcon } from "@/components/ui/icons/check";
import { MailIcon } from "@/components/ui/icons/mail";
import { WhatsappIcon } from "@/components/ui/icons/whatsapp";
import { XmarkIcon } from "@/components/ui/icons/xmark";
import { useScrollLock } from "@/hooks/use-scroll-lock";
import { WAITLIST_COMMUNITY } from "@/lib/landing";

/** Angle, distance and spin per piece — scattered by hand so the burst is not a ring. */
const CONFETTI = [
  {
    x: -132,
    y: -34,
    spin: -220,
    delay: 0,
    tone: "bg-jumpa-alt-400",
    size: "size-2",
  },
  {
    x: -96,
    y: 48,
    spin: 160,
    delay: 60,
    tone: "bg-jumpa-primary-400",
    size: "size-1.5",
  },
  {
    x: -58,
    y: -72,
    spin: 300,
    delay: 20,
    tone: "bg-jumpa-alt-300",
    size: "size-1.5",
  },
  {
    x: -24,
    y: 74,
    spin: -140,
    delay: 110,
    tone: "bg-jumpa-primary-200",
    size: "size-2",
  },
  {
    x: 26,
    y: -80,
    spin: 200,
    delay: 40,
    tone: "bg-jumpa-alt-400",
    size: "size-1.5",
  },
  {
    x: 62,
    y: 56,
    spin: -260,
    delay: 90,
    tone: "bg-jumpa-primary-500",
    size: "size-2",
  },
  {
    x: 104,
    y: -44,
    spin: 240,
    delay: 30,
    tone: "bg-jumpa-alt-200",
    size: "size-1.5",
  },
  {
    x: 138,
    y: 30,
    spin: -180,
    delay: 130,
    tone: "bg-jumpa-primary-300",
    size: "size-2",
  },
] as const;

/**
 * The moment after a waitlist signup. The email still goes out — this is the
 * thing that cannot wait for an inbox, so it leads with the group.
 *
 * Portalled to the body: every form that raises it sits inside `<main>`, which
 * carries the landing frame's unit, and a modal measured in that unit would
 * scale with the marketing board instead of the viewport.
 */
export function WaitlistModal({
  returning,
  position,
  onClose,
}: {
  /** Already on the list — the copy congratulates rather than welcomes. */
  returning: boolean;
  position: number | null;
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useScrollLock(true);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!mounted) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="waitlist-modal-title"
      className="fixed inset-0 z-100 flex items-end justify-center p-4 sm:items-center"
    >
      {/* The scrim is its own button, like every sheet in the app. */}
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 animate-fade cursor-default bg-jumpa-black/70 backdrop-blur-xs"
      />

      <div className="relative w-full max-w-104 animate-sheet-up overflow-hidden rounded-3xl bg-jumpa-white shadow-jumpa-card sm:animate-pop-in">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="tap absolute top-3.5 right-3.5 z-10 flex size-8 items-center justify-center rounded-full bg-jumpa-white/15 text-jumpa-white/80 hover:bg-jumpa-white/25 hover:text-jumpa-white active:scale-90"
        >
          <XmarkIcon className="size-3.5" />
        </button>

        {/* ── Celebration header ── */}
        <div className="relative flex flex-col items-center overflow-hidden bg-[image:var(--gradient-jumpa-landing)] px-6 pt-9 pb-8 text-center">
          {/* Confetti and glow are transform/opacity only, so the card never reflows. */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-14 left-1/2 size-40 -translate-x-1/2 rounded-full bg-jumpa-alt-400/25 blur-3xl"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-16 left-1/2 flex -translate-x-1/2"
          >
            {CONFETTI.map((piece) => (
              <span
                key={`${piece.x}:${piece.y}`}
                className={`absolute animate-confetti rounded-[1px] ${piece.size} ${piece.tone}`}
                style={
                  {
                    "--dx": `${piece.x}px`,
                    "--dy": `${piece.y}px`,
                    "--spin": `${piece.spin}deg`,
                    animationDelay: `${piece.delay}ms`,
                  } as CSSProperties
                }
              />
            ))}
          </span>

          <span className="relative flex size-16 items-center justify-center rounded-full bg-jumpa-alt-400 text-jumpa-primary-950 shadow-jumpa-toast">
            <CheckIcon className="size-8" strokeWidth={2.5} />
          </span>

          <h2
            id="waitlist-modal-title"
            className="relative mt-5 text-2xl leading-7 font-bold text-jumpa-white"
          >
            {returning
              ? WAITLIST_COMMUNITY.returningHeading
              : WAITLIST_COMMUNITY.heading}
          </h2>

          {position ? (
            <p className="relative mt-2.5 rounded-pill bg-jumpa-white/15 px-3 py-1 text-xs font-semibold text-jumpa-white">
              #{position.toLocaleString()} in line
            </p>
          ) : null}
        </div>

        {/* ── The ask ── */}
        <div className="flex flex-col gap-4 px-6 pt-5 pb-6">
          <p className="text-center text-sm leading-5 text-jumpa-neutral-600">
            {WAITLIST_COMMUNITY.blurb}
          </p>

          <a
            href={WAITLIST_COMMUNITY.url}
            target="_blank"
            rel="noreferrer"
            onClick={onClose}
            style={{ backgroundColor: WAITLIST_COMMUNITY.brand }}
            className="tap flex h-14 items-center justify-center gap-2.5 rounded-pill text-base font-semibold text-jumpa-white shadow-jumpa-toast active:scale-[0.98]"
          >
            <WhatsappIcon className="size-5.5" />
            {WAITLIST_COMMUNITY.cta}
          </a>

          <ul className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1.5">
            {WAITLIST_COMMUNITY.perks.map((perk) => (
              <li
                key={perk}
                className="flex items-center gap-1 rounded-pill bg-jumpa-primary-50 px-2.5 py-1 text-[11px] font-medium text-jumpa-primary-950"
              >
                <CheckIcon className="size-3 text-jumpa-primary-600" />
                {perk}
              </li>
            ))}
          </ul>

          <p className="flex items-center justify-center gap-1.5 text-center text-[11px] leading-4 text-jumpa-neutral-425">
            <MailIcon className="size-3.5 shrink-0 text-jumpa-primary-400" />
            {WAITLIST_COMMUNITY.emailNote}
          </p>

          <button
            type="button"
            onClick={onClose}
            className="tap text-sm font-medium text-jumpa-neutral-425 hover:text-jumpa-black"
          >
            {WAITLIST_COMMUNITY.dismiss}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
