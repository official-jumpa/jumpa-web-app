"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Art } from "@/components/landing/art";
import { LandingButton } from "@/components/landing/landing-button";
import { useScrollLock } from "@/hooks/use-scroll-lock";
import { CTA, NAV_LINKS } from "@/lib/landing";

const BAR = "absolute left-4.5 h-1.5 w-15 rounded-full bg-jumpa-ink";

/** The phone nav: a menu button that drops a sheet of section links. */
export function MobileMenu() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  useScrollLock(open);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        aria-label="Open menu"
        aria-expanded={open}
        aria-controls="landing-menu"
        onClick={() => setOpen(true)}
        className="tap relative mt-3.75 h-22.5 w-24 active:scale-90"
      >
        <span className={`${BAR} top-6`} />
        <span className={`${BAR} top-10.5`} />
        <span className={`${BAR} top-15`} />
      </button>

      {open && (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            aria-label="Close menu"
            tabIndex={-1}
            onClick={close}
            className="absolute inset-0 cursor-default"
          />
          <div
            id="landing-menu"
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            className="relative animate-drop-in bg-jumpa-white"
          >
            <div className="relative mx-auto h-313 w-402">
              <Link
                href="/"
                onClick={close}
                aria-label="Jumpa home"
                className="absolute top-21.75 left-39.75 w-65"
              >
                <Image
                  src="/logo/wordmark/purple.png"
                  alt=""
                  width={384}
                  height={80}
                  className="h-auto w-full"
                />
              </Link>

              <button
                type="button"
                aria-label="Close menu"
                onClick={close}
                className="tap absolute top-15 left-353 flex items-center justify-center rounded-full bg-jumpa-neutral-50 p-6.25 active:scale-90"
              >
                <Art
                  src="/images/landing/menu-close.svg"
                  className="size-15.25"
                />
              </button>

              <nav
                aria-label="Sections"
                className="absolute top-55 left-27 flex w-346 flex-col gap-12.25"
              >
                {NAV_LINKS.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={close}
                    className="tap flex h-37 items-center justify-between rounded-full bg-jumpa-surface px-30 font-medium text-jumpa-black text-u-12/15 -tracking-u-0.5 active:scale-[0.98]"
                  >
                    {link.label}
                    <span className="flex h-8.25 w-5 items-center justify-center">
                      <Art
                        src="/images/landing/menu-chevron.svg"
                        className="h-5 w-8.25 flex-none -rotate-90 -scale-y-100"
                      />
                    </span>
                  </a>
                ))}
              </nav>

              <div className="absolute top-255 left-27">
                <LandingButton
                  href={CTA.join.href}
                  className="h-37 w-348 text-u-10/15.5"
                >
                  {CTA.join.label}
                </LandingButton>
              </div>

              <span
                aria-hidden="true"
                className="absolute top-301 left-1/2 h-6 w-120 -translate-x-1/2 rounded-full bg-jumpa-neutral-75"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
