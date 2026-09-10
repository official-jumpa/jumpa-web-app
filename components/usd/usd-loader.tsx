"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useScrollLock } from "@/hooks/use-scroll-lock";

/** r=54 on a 116 box, so the ring's own stroke has room at every edge. */
const CIRCUMFERENCE = 2 * Math.PI * 54;

/** The design's arc covers 225 degrees; the rest of the ring is the gap. */
const ARC = (CIRCUMFERENCE * 225) / 360;

/**
 * Opening the account. Portalled to the body and deliberately not dismissable —
 * there is nothing to go back to until it resolves.
 */
export function UsdLoader({ label }: { label: string }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useScrollLock(true);

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 mx-auto flex max-w-app items-center justify-center px-4.5">
      <div className="absolute inset-0 animate-fade bg-jumpa-black/60" />

      <div className="relative flex h-55.25 w-full animate-pop-in items-center justify-center rounded-panel bg-jumpa-white">
        <span className="relative flex size-29 items-center justify-center">
          {/* One rotating svg: the pale ring is a full circle, so turning it
              with the arc costs nothing and keeps them concentric. */}
          <svg
            viewBox="0 0 116 116"
            aria-hidden="true"
            className="absolute inset-0 size-full animate-spin"
          >
            <circle
              cx="58"
              cy="58"
              r="54"
              fill="none"
              strokeWidth="8"
              className="stroke-jumpa-primary-50"
            />
            <circle
              cx="58"
              cy="58"
              r="54"
              fill="none"
              strokeWidth="8"
              strokeDasharray={`${ARC} ${CIRCUMFERENCE - ARC}`}
              className="spinner-arc stroke-jumpa-primary-600"
            />
          </svg>

          {/* The alpha-trimmed mark; the raw logo is mostly padding. */}
          <Image
            src="/logo/mark/purple.png"
            alt=""
            width={803}
            height={381}
            className="w-14.75"
          />
        </span>
        {/* `output` is the live region; a `role="status"` div is the same thing. */}
        <output className="sr-only">{label}</output>
      </div>
    </div>,
    document.body,
  );
}
