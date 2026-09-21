import Image from "next/image";
import Link from "next/link";
import { CtaPill } from "@/components/landing/cta-pill";
import { revealStep } from "@/components/landing/reveal";
// import { cn } from "@/lib/cn";
import { CTA_LABEL } from "@/lib/landing";

/** Top bar: wordmark and the beta pill. */
export function LandingNav() {
  return (
    <header className="relative z-20 mx-auto w-393 pt-25 md:w-1440 md:pt-48">
      {/* The bar is always above the fold, so it drops in at the first paint
          from plain utilities rather than waiting on `RevealObserver`. */}
      {/* `min-h` so the bar grows for the logo rather than letting it overflow
          at 768, where the frame unit is at its smallest. */}
      <div className="mx-auto flex h-32.25 w-320 items-center justify-between md:h-auto md:min-h-50 md:w-1300">
        <Link
          prefetch
          href="/"
          aria-label="Jumpa home"
          className="shrink-0 animate-drop-in"
        >
          {/* The frames draw the wordmark at 25% of a phone and 10% of a desktop,
              so a unit-scaled logo halves at `md:`. Desktop floors it at the 140px
              the phone frame reaches (so it never shrinks as the screen grows),
              then follows the design's 9.93vw up to 254px at the 2560 ceiling. */}
          <Image
            src="/logo/wordmark/purple.png"
            alt=""
            width={384}
            height={80}
            priority
            sizes="254px"
            className="h-auto w-100 md:w-[clamp(140px,9.93vw,254px)]"
          />
        </Link>
        {/* Section links — off until their sections are back on the page. */}
        {/* <nav aria-label="Sections" className="hidden lg:block">
          <ul className="flex items-center gap-24 text-u-16/34 tracking-jumpa">
            {NAV_LINKS.map((link, index) => (
              <li
                key={link.label}
                style={revealStep(index + 1)}
                className="stagger animate-drop-in"
              >
                <a
                  href={link.href}
                  className={cn(
                    "tap whitespace-nowrap hover:text-jumpa-black",
                    index === 0
                      ? "font-bold text-jumpa-black"
                      : "font-semibold text-jumpa-black/50",
                  )}
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav> */}
        {/* Scrolls to the hero's email field. Floored the same way as the logo,
            so the pill never shrinks as the screen grows. */}
        <CtaPill
          href="#join"
          style={revealStep(1)}
          className="pill-u-10.25 stagger animate-drop-in md:pill-u-16 md:[--pill-fs:clamp(14.34px,1.111vw,28.44px)]"
        >
          {CTA_LABEL}
        </CtaPill>
      </div>
    </header>
  );
}
