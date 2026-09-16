import Image from "next/image";
import Link from "next/link";
import { CtaPill } from "@/components/landing/cta-pill";
import { revealStep } from "@/components/landing/reveal";
import { cn } from "@/lib/cn";
import { CTA_LABEL, NAV_LINKS } from "@/lib/landing";

/** Top bar: wordmark, desktop-only section links, and the beta pill. */
export function LandingNav() {
  return (
    <header className="relative z-20 mx-auto w-393 pt-25 md:w-1440 md:pt-48">
      {/* The bar is always above the fold, so it drops in at the first paint
          from plain utilities rather than waiting on `RevealObserver`. */}
      <div className="mx-auto flex h-32.25 w-320 items-center justify-between md:h-50 md:w-1300">
        <Link
          href="/"
          aria-label="Jumpa home"
          className="shrink-0 animate-drop-in"
        >
          <Image
            src="/logo/wordmark/purple.png"
            alt=""
            width={384}
            height={80}
            priority
            sizes="143px"
            className="h-23.75 w-100 object-contain md:h-34 md:w-143"
          />
        </Link>
        {/* Links stay `lg:` while the rest of the bar is `md:` — they are 16
            design px, which the tablet frame renders at 8.5. */}
        <nav aria-label="Sections" className="hidden lg:block">
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
        </nav>
        {/* The design gives the pill no destination; it scrolls to the beta form. */}
        <CtaPill
          href="#join"
          style={revealStep(NAV_LINKS.length + 1)}
          className="pill-u-10.25 stagger animate-drop-in md:pill-u-16"
        >
          {CTA_LABEL}
        </CtaPill>
      </div>
    </header>
  );
}
