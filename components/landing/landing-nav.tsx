import Image from "next/image";
import Link from "next/link";
import { LandingButton } from "@/components/landing/landing-button";
import { MobileMenu } from "@/components/landing/mobile-menu";
import { CTA, NAV_LINKS } from "@/lib/landing";

// The design's fixed tab widths, in `NAV_LINKS` order.
const TAB_WIDTH = ["w-105", "w-90", "w-80", "w-62"];

/** Frosted bar over the hero. Phones fold the links into `MobileMenu`. */
export function LandingNav() {
  return (
    <header className="sticky top-0 z-40 h-65 md:h-95">
      {/* The frost sits on its own layer: a `backdrop-filter` on the header
          would trap the menu sheet's `fixed` box inside it. */}
      <span
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-jumpa-white/4 backdrop-blur-u-20"
      />
      <div className="relative mx-auto h-full w-402 md:w-1440">
        <Link
          href="/"
          aria-label="Jumpa home"
          className="absolute top-25.75 left-43.75 w-65 md:top-33.75 md:left-108.75 md:w-140.25"
        >
          <Image
            src="/logo/wordmark/purple.png"
            alt=""
            width={384}
            height={80}
            priority
            className="h-auto w-full"
          />
        </Link>

        <nav
          aria-label="Sections"
          className="absolute top-24 left-1/2 hidden w-420 -translate-x-1/2 items-center justify-center gap-14 rounded-u-40 bg-jumpa-white py-7 md:flex"
        >
          {NAV_LINKS.map((link, index) => (
            <a
              key={link.href}
              href={link.href}
              className={`tap flex h-31 shrink-0 items-center justify-center whitespace-nowrap font-medium text-jumpa-black text-u-14/17.75 -tracking-u-0.5 hover:text-jumpa-primary-600 ${TAB_WIDTH[index]}`}
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="absolute top-25 left-1236 hidden md:block">
          <LandingButton
            href={CTA.join.href}
            className="px-20 py-11 text-u-14/21.75 -tracking-u-0.5"
          >
            {CTA.join.label}
          </LandingButton>
        </div>

        <div className="absolute top-17.5 right-24 flex items-start gap-9 md:hidden">
          <LandingButton
            href={CTA.join.href}
            className="h-30 w-68 text-u-10/15.5 -tracking-u-0.25"
          >
            {CTA.join.label}
          </LandingButton>
          <MobileMenu />
        </div>
      </div>
    </header>
  );
}
