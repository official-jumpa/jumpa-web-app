import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { FooterEmailForm } from "@/components/landing/email-capture-form";
import { revealStep } from "@/components/landing/reveal";
import { ArrowUpRightIcon } from "@/components/ui/icons/arrow-up-right";
import { cn } from "@/lib/cn";
import { FOOTER } from "@/lib/landing";

const COLUMN = "flex flex-col gap-40 md:w-160";
const COLUMN_TITLE =
  "text-u-16/18 font-medium tracking-jumpa-wide text-jumpa-white md:text-u-24/20";
const COLUMN_LINK =
  "tap text-u-14/16 font-medium tracking-jumpa-wide text-jumpa-white/50 hover:text-jumpa-alt-400 md:text-u-24/20";

function Column({
  title,
  children,
  className,
  style,
}: {
  title: string;
  children: ReactNode;
  className?: string;
  /** Only for the reveal's `--i`; the column takes no inline geometry. */
  style?: CSSProperties;
}) {
  return (
    <div className={cn(COLUMN, className)} style={style}>
      <h2 className={COLUMN_TITLE}>{title}</h2>
      <ul className="flex flex-col gap-24">{children}</ul>
    </div>
  );
}

/**
 * Footer. The purple band starts 92 design px before the beta card ends, which
 * is what the negative margin reproduces — the card sits on the gradient. The
 * design stacks the three link columns on the phone frame and rows them on
 * desktop, so one markup serves both.
 */
export function LandingFooter() {
  return (
    // Beta card off, so no `md:-mt-92`; 129 is the purple it left visible (221-92).
    <footer className="border-u-2 border-jumpa-primary-50/50 bg-[image:var(--gradient-jumpa-landing)] pt-50 pb-60 md:pt-129 md:pb-79">
      <div className="mx-auto flex w-320 flex-col gap-50 md:w-1300 md:flex-row md:justify-between md:gap-0">
        {/* The footer deals itself out in four: the brand block, the two link
            columns, then the beta form and the legal line. */}
        <div
          style={revealStep(0)}
          className="reveal flex flex-col gap-50 md:w-320 md:gap-141"
        >
          <div className="flex flex-col gap-15">
            <span className="flex items-center gap-9.25">
              <img
                src="/images/landing/logo-mark-lime.svg"
                alt=""
                aria-hidden="true"
                className="h-32.25 w-69"
              />
              <img
                src="/images/landing/logo-wordmark-lime.svg"
                alt="Jumpa"
                className="h-32.5 w-103.25"
              />
            </span>
            <p className="w-194 text-center text-u-13.75/15 font-medium tracking-jumpa text-jumpa-white">
              {FOOTER.tagline}
            </p>
          </div>
          <p className="flex gap-20 text-u-16/18 font-medium tracking-jumpa-wide text-jumpa-white md:text-u-24/20">
            <span>{FOOTER.copyright.year}</span>
            <span>{FOOTER.copyright.owner}</span>
          </p>
        </div>

        <div className="flex flex-col gap-50 md:w-731.25 md:gap-52">
          <div className="flex flex-col gap-75 md:flex-row md:gap-100">
            {/* Same dead section anchors as the top bar — off with them. */}
            {/* <Column
              title={FOOTER.columns[0].heading}
              className="reveal"
              style={revealStep(1)}
            >
              {FOOTER.columns[0].links.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className={COLUMN_LINK}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </Column> */}

            <Column title="Socials" className="reveal" style={revealStep(1)}>
              {FOOTER.socials.map((social) => (
                <li key={social.label}>
                  <a
                    href={social.href}
                    target="_blank"
                    rel="noreferrer"
                    className={`${COLUMN_LINK} inline-flex items-center gap-4`}
                  >
                    {social.label}
                    <ArrowUpRightIcon className="size-16 shrink-0" />
                  </a>
                </li>
              ))}
            </Column>
          </div>

          <span aria-hidden="true" className="h-1.25 w-full bg-jumpa-white" />

          <div className="flex flex-col gap-52">
            <div
              style={revealStep(3)}
              className="reveal flex flex-col gap-20 md:flex-row md:items-center md:justify-between md:gap-0"
            >
              <div className="flex flex-col gap-8 text-u-14/20 font-medium tracking-jumpa-snug md:w-293">
                <p className="text-jumpa-white">{FOOTER.betaTitle}</p>
                <p className="text-jumpa-white/50">{FOOTER.betaBlurb}</p>
              </div>
              <FooterEmailForm />
            </div>

            <div style={revealStep(4)} className="reveal flex gap-16">
              {FOOTER.legal.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className="tap text-u-14/20 font-medium tracking-jumpa-snug text-jumpa-white/50 hover:text-jumpa-alt-400"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
