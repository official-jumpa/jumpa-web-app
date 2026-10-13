import Image from "next/image";
import Link from "next/link";
import { Art } from "@/components/landing/art";
import { revealStep } from "@/components/landing/reveal";
import { FOOTER, FOOTER_COLUMNS } from "@/lib/landing";

const IMG = "/images/landing";

const LINK =
  "tap font-normal text-jumpa-white transition-colors duration-300 hover:text-jumpa-alt-400";

function FooterLink({ href, children }: { href: string; children: string }) {
  if (href.startsWith("/")) {
    return (
      <Link href={href} className={LINK}>
        {children}
      </Link>
    );
  }
  const external = href.startsWith("http");
  return (
    <a
      href={href}
      className={LINK}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
    >
      {children}
    </a>
  );
}

/** Phones stack every block in flow; from `md:` each block is pinned to the 1440 board. */
export function LandingFooter() {
  return (
    <footer className="relative overflow-clip bg-[image:var(--gradient-jumpa-landing)]">
      <div className="relative mx-auto flex h-969 w-402 flex-col items-start gap-32 px-20 pt-48 pb-32 text-jumpa-white md:block md:h-610 md:w-1440 md:p-0">
        <Art
          src={`${IMG}/footer-grid.svg`}
          className="drift absolute -top-30 left-300 hidden h-640 w-812.5 md:block"
        />

        <Link
          href="/"
          aria-label="Jumpa home"
          className="reveal flex gap-8.75 md:absolute md:top-94.25 md:left-107 md:gap-13.25"
        >
          <Art
            src={`${IMG}/footer-mark.svg`}
            className="h-30 w-64.25 md:h-45.5 md:w-97.25"
          />
          <Art
            src={`${IMG}/footer-wordmark.svg`}
            className="h-30.25 w-96 md:h-45.75 md:w-145.5"
          />
        </Link>

        <div className="flex flex-col gap-8 md:contents">
          <p
            style={revealStep(1)}
            className="reveal text-u-18/23.25 -tracking-u-0.75 md:absolute md:top-167.75 md:left-105 md:w-249"
          >
            {FOOTER.tagline}
          </p>
          <p className="text-u-14/18 -tracking-u-0.5 md:absolute md:top-360.25 md:left-105 md:whitespace-nowrap md:text-u-18/23.25 md:-tracking-u-0.75">
            {FOOTER.rc}
          </p>
        </div>

        <div className="flex flex-col gap-32 md:absolute md:top-99.25 md:left-689 md:flex-row md:gap-0">
          {FOOTER_COLUMNS.map((column, i) => (
            <nav
              key={column.heading}
              aria-label={column.heading}
              style={revealStep(i + 1)}
              className="reveal flex flex-col items-start gap-12 whitespace-nowrap text-u-16/21 -tracking-u-0.75 md:w-281 md:gap-10.75 md:text-u-18/23.25 md:last:w-auto"
            >
              <h2 className="font-bold text-jumpa-alt-400">{column.heading}</h2>
              {column.links.map((link) => (
                <FooterLink key={link.label} href={link.href}>
                  {link.label}
                </FooterLink>
              ))}
            </nav>
          ))}
        </div>

        <Art
          src={`${IMG}/footer-rule.svg`}
          className="absolute top-324.25 left-106 hidden h-1.25 w-1229.75 md:block"
        />
        <p className="text-u-14/18 -tracking-u-0.5 md:absolute md:top-355.75 md:left-1078 md:whitespace-nowrap md:text-u-18/23.25 md:-tracking-u-0.75">
          {FOOTER.copyright}
        </p>

        <div
          aria-hidden="true"
          className="absolute top-414 left-204 hidden gap-49.75 md:flex"
        >
          <Art src={`${IMG}/footer-mark-lg.svg`} className="h-172.25 w-367" />
          <Art
            src={`${IMG}/footer-wordmark-lg.svg`}
            className="h-173 w-549.5"
          />
        </div>
        <span
          aria-hidden="true"
          className="absolute top-450 -left-19 hidden h-243 w-1442 bg-jumpa-primary-400 blur-u-65 md:block"
        />

        <div className="absolute bottom-0 left-0 h-107 w-403 overflow-hidden md:hidden">
          <Image
            src={`${IMG}/footer-art-mobile.webp`}
            width={804}
            height={365}
            sizes="(min-width: 768px) 1px, 100vw"
            alt=""
            className="absolute -top-13 left-0 h-183 w-403 max-w-none"
          />
        </div>
      </div>
    </footer>
  );
}
