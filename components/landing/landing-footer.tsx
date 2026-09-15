import Link from "next/link";
import type { ReactNode } from "react";
import { FooterEmailForm } from "@/components/landing/email-capture-form";
import { ArrowUpRightIcon } from "@/components/ui/icons/arrow-up-right";
import { FOOTER } from "@/lib/landing";

const COLUMN = "flex flex-col gap-40 lg:w-160";
const COLUMN_TITLE =
  "text-u-24/20 font-medium tracking-jumpa-wide text-jumpa-white";
const COLUMN_LINK =
  "tap text-u-24/20 font-medium tracking-jumpa-wide text-jumpa-white/50 hover:text-jumpa-alt-400";

function Column({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className={COLUMN}>
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
    <footer className="border-u-2 border-jumpa-primary-50/50 bg-[image:var(--gradient-jumpa-landing)] pt-50 pb-100 lg:-mt-92 lg:pt-221 lg:pb-79">
      <div className="mx-auto flex w-320 flex-col gap-50 lg:w-1300 lg:flex-row lg:justify-between lg:gap-0">
        <div className="flex flex-col gap-50 lg:w-320 lg:gap-141">
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
          <p className="flex gap-20 text-u-24/20 font-medium tracking-jumpa-wide text-jumpa-white">
            <span>{FOOTER.copyright.year}</span>
            <span>{FOOTER.copyright.owner}</span>
          </p>
        </div>

        <div className="flex flex-col gap-50 lg:w-731.25 lg:gap-52">
          <div className="flex flex-col gap-75 lg:flex-row lg:gap-100">
            <Column title={FOOTER.columns[0].heading}>
              {FOOTER.columns[0].links.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className={COLUMN_LINK}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </Column>

            <Column title="Socials">
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

            {/* The design repeats an identical "Company" column; kept verbatim. */}
            <Column title={FOOTER.columns[1].heading}>
              {FOOTER.columns[1].links.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className={COLUMN_LINK}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </Column>
          </div>

          <span aria-hidden="true" className="h-1.25 w-full bg-jumpa-white" />

          <div className="flex flex-col gap-52">
            <div className="flex flex-col gap-20 lg:flex-row lg:items-center lg:justify-between lg:gap-0">
              <div className="flex flex-col gap-8 text-u-14/20 font-medium tracking-jumpa-snug lg:w-293">
                <p className="text-jumpa-white">{FOOTER.betaTitle}</p>
                <p className="text-jumpa-white/50">{FOOTER.betaBlurb}</p>
              </div>
              <FooterEmailForm />
            </div>

            <div className="flex gap-16">
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
