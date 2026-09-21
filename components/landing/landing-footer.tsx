import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { FooterEmailForm } from "@/components/landing/email-capture-form";
import { revealStep } from "@/components/landing/reveal";
import { ArrowUpRightIcon } from "@/components/ui/icons/arrow-up-right";
import { cn } from "@/lib/cn";
import { FOOTER } from "@/lib/landing";

/*
 * Type and marks are floored in real px from `md:` up. The desktop frame renders
 * at ~53% around 768, which drew every line smaller here than on a phone; the
 * floor is each element's own 1440 design value, and the vw term carries it on
 * to the 2560 ceiling. The row layouts move to `lg:`/`xl:` for the same reason —
 * the design's 1300px columns cannot hold floored text at 768.
 */
const TEXT_24 = "md:text-[clamp(24px,1.6667vw,42.67px)] md:leading-[0.8333em]";
const TEXT_14 = "md:text-[clamp(14px,0.9722vw,24.89px)] md:leading-[1.4286em]";

// The column's width is floored too, or the 1440 frame draws it 114px at 1024
// and "Instagram" plus its arrow — now real px — runs out of it.
const COLUMN =
  "flex flex-col gap-40 md:gap-[clamp(40px,2.7778vw,71.11px)] lg:w-[clamp(160px,11.1111vw,284.44px)]";
const COLUMN_TITLE = `text-u-16/18 font-medium tracking-jumpa-wide text-jumpa-white ${TEXT_24}`;
const COLUMN_LINK = `tap text-u-14/16 font-medium tracking-jumpa-wide text-jumpa-white/85 hover:text-jumpa-alt-400 ${TEXT_24}`;

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
      <ul className="flex flex-col gap-24 md:gap-[clamp(24px,1.6667vw,42.67px)]">
        {children}
      </ul>
    </div>
  );
}

/**
 * Footer. The design stacks the link columns on the phone frame and rows them on
 * desktop, so one markup serves both.
 */
export function LandingFooter() {
  return (
    // Beta card off, so no `md:-mt-92`; 129 is the purple it left visible (221-92).
    <footer className="border-u-2 border-jumpa-primary-50/50 bg-[image:var(--gradient-jumpa-landing)] pt-50 pb-60 md:pt-129 md:pb-79">
      <div className="mx-auto flex w-320 flex-col gap-50 md:w-1300 md:gap-[clamp(50px,3.4722vw,88.89px)] lg:flex-row lg:justify-between lg:gap-0">
        {/* The footer deals itself out in four: the brand block, the link
            column, then the beta form and the legal line. */}
        <div
          style={revealStep(0)}
          className="reveal flex flex-col gap-50 md:gap-[clamp(50px,3.4722vw,88.89px)] lg:w-320 lg:gap-[clamp(141px,9.7917vw,250.67px)]"
        >
          <div className="flex flex-col gap-15 md:gap-[clamp(15px,1.0417vw,26.67px)]">
            <span className="flex items-center gap-9.25 md:gap-[clamp(9.25px,0.6424vw,16.44px)]">
              <img
                src="/images/landing/logo-mark-lime.svg"
                alt=""
                aria-hidden="true"
                className="h-32.25 w-69 md:h-[clamp(32.25px,2.2396vw,57.33px)] md:w-[clamp(69px,4.7917vw,122.67px)]"
              />
              <img
                src="/images/landing/logo-wordmark-lime.svg"
                alt="Jumpa"
                className="h-32.5 w-103.25 md:h-[clamp(32.5px,2.2569vw,57.78px)] md:w-[clamp(103.25px,7.1701vw,183.56px)]"
              />
            </span>
            <p className="w-194 text-center text-u-13.75/15 font-medium tracking-jumpa text-jumpa-white md:w-[clamp(194px,13.4722vw,344.89px)] md:text-[clamp(13.75px,0.9549vw,24.44px)] md:leading-[1.0909em]">
              {FOOTER.tagline}
            </p>
          </div>
          <p
            className={`flex gap-20 text-u-16/18 font-medium tracking-jumpa-wide text-jumpa-white md:gap-[clamp(20px,1.3889vw,35.56px)] ${TEXT_24}`}
          >
            <span>{FOOTER.copyright.year}</span>
            <span>{FOOTER.copyright.owner}</span>
          </p>
        </div>

        <div className="flex flex-col gap-50 md:gap-[clamp(52px,3.6111vw,92.44px)] lg:w-731.25">
          <div className="flex flex-col gap-75 lg:flex-row lg:gap-100">
            {/* Same dead section anchors as the top bar — off with them. */}
            {/* <Column
              title={FOOTER.columns[0].heading}
              className="reveal"
              style={revealStep(1)}
            >
              {FOOTER.columns[0].links.map((link) => (
                <li key={link.label}>
                  <Link prefetch href={link.href} className={COLUMN_LINK}>
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
                    <ArrowUpRightIcon className="size-16 shrink-0 md:size-[clamp(16px,1.1111vw,28.44px)]" />
                  </a>
                </li>
              ))}
            </Column>
          </div>

          <span aria-hidden="true" className="h-1.25 w-full bg-jumpa-white" />

          <div className="flex flex-col gap-52 md:gap-[clamp(52px,3.6111vw,92.44px)]">
            <div
              style={revealStep(3)}
              className="reveal flex flex-col gap-20 md:gap-[clamp(20px,1.3889vw,35.56px)] xl:flex-row xl:items-center xl:justify-between xl:gap-0"
            >
              <div
                className={`flex flex-col gap-8 text-u-14/20 font-medium tracking-jumpa-snug md:gap-[clamp(8px,0.5556vw,14.22px)] xl:w-293 ${TEXT_14}`}
              >
                <p className="text-jumpa-white">{FOOTER.betaTitle}</p>
                <p className="text-jumpa-white/85">{FOOTER.betaBlurb}</p>
              </div>
              <FooterEmailForm />
            </div>

            <div
              style={revealStep(4)}
              className="reveal flex gap-16 md:gap-[clamp(16px,1.1111vw,28.44px)]"
            >
              {FOOTER.legal.map((link) => (
                <Link
                  prefetch
                  key={link.label}
                  href={link.href}
                  className={`tap text-u-14/20 font-medium tracking-jumpa-snug text-jumpa-white/85 hover:text-jumpa-alt-400 ${TEXT_14}`}
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
