import Image from "next/image";
import Link from "next/link";
import { CtaPill } from "@/components/landing/cta-pill";
import { cn } from "@/lib/cn";
import { CTA_LABEL, NAV_LINKS } from "@/lib/landing";

/** Top bar: wordmark, desktop-only section links, and the beta pill. */
export function LandingNav() {
  return (
    <header className="relative z-20 mx-auto w-393 pt-25 lg:w-1440 lg:pt-48">
      <div className="mx-auto flex h-32.25 w-320 items-center justify-between lg:h-50 lg:w-1300">
        <Link href="/" aria-label="Jumpa home" className="shrink-0">
          <Image
            src="/logo/wordmark/purple.png"
            alt=""
            width={384}
            height={80}
            priority
            sizes="143px"
            className="h-23.75 w-100 object-contain lg:h-34 lg:w-143"
          />
        </Link>
        <nav aria-label="Sections" className="hidden lg:block">
          <ul className="flex items-center gap-24 text-u-16/34 tracking-jumpa">
            {NAV_LINKS.map((link, index) => (
              <li key={link.label}>
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
        <CtaPill href="#join" className="pill-u-10.25 lg:pill-u-16">
          {CTA_LABEL}
        </CtaPill>
      </div>
    </header>
  );
}
