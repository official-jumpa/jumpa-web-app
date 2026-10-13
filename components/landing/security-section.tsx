import Image from "next/image";
import { Art } from "@/components/landing/art";
import { PinPreview } from "@/components/landing/pin-preview";
import { revealStep } from "@/components/landing/reveal";
import { SectionBadge } from "@/components/landing/section-badge";
import { SnapCarousel } from "@/components/landing/snap-carousel";
import { cn } from "@/lib/cn";
import { SECURITY, type SecurityId } from "@/lib/landing";

const IMG = "/images/landing";

/** Each text block is centred on its y, as the design places it. */
const BLOCK = "absolute flex -translate-y-1/2 flex-col justify-center";

const DESKTOP_TEXT: Record<SecurityId, { title: string; body: string }> = {
  access: {
    title: "top-408 left-38.5 h-70.25 w-328.25",
    body: "top-504.75 left-39 h-88 w-309",
  },
  review: {
    title: "top-407.75 left-39 h-70 w-248",
    body: "top-489.5 left-38.5 h-47.75 w-309.75",
  },
  approve: {
    title: "top-408 left-38.5 h-70.25 w-328.25",
    body: "top-489.5 left-38.5 h-47.75 w-309.75",
  },
};

const MOBILE_TEXT: Record<SecurityId, { title: string; body: string }> = {
  access: { title: "w-333", body: "w-295" },
  review: { title: "w-316", body: "w-261" },
  approve: { title: "w-316", body: "w-261" },
};

const DESKTOP_LEFT: Record<SecurityId, string> = {
  access: "left-107 bg-[image:var(--gradient-jumpa-security-card)]",
  review: "left-523 bg-jumpa-surface",
  approve: "left-939 bg-jumpa-surface",
};

/** Card art in design px; the phone frame scales the PIN prompt to 0.91. */
function CardArt({ id, mobile }: { id: SecurityId; mobile?: boolean }) {
  if (id === "access") {
    return (
      <>
        <Art
          src={`${IMG}/security-glow-b.svg`}
          className={cn(
            "absolute h-323.5 w-510",
            mobile ? "top-176.75 -left-75.5" : "top-279.75 -left-55.75",
          )}
        />
        <Image
          src={`${IMG}/security-access.webp`}
          width={553}
          height={466}
          sizes={
            mobile
              ? "(min-width: 768px) 1px, 60vw"
              : "(min-width: 1440px) 277px, 20vw"
          }
          alt=""
          className={cn(
            "absolute",
            mobile
              ? "top-31 left-55 h-194.75 w-231"
              : "top-88 left-56 h-233 w-276.5",
          )}
        />
      </>
    );
  }
  if (id === "review") {
    return (
      <Image
        src={`${IMG}/security-review.webp`}
        width={628}
        height={502}
        sizes={
          mobile
            ? "(min-width: 768px) 1px, 66vw"
            : "(min-width: 1440px) 314px, 22vw"
        }
        alt=""
        className={cn(
          "absolute",
          mobile
            ? "top-47 left-53 h-204.75 w-256"
            : "top-88.75 left-44 h-251 w-314",
        )}
      />
    );
  }
  return (
    <>
      <Art
        src={`${IMG}/security-glow-a.svg`}
        className={cn(
          "absolute h-333 w-525.75 -scale-x-100",
          mobile ? "top-176.75 -left-76.75" : "top-266.75 -left-54.25",
        )}
      />
      <Art
        src={`${IMG}/pin-shadow.svg`}
        className={cn(
          "absolute h-26 w-72 -rotate-[6.66deg]",
          mobile ? "top-245.75 left-257" : "top-328.75 left-280",
        )}
      />
      <PinPreview
        className={
          mobile
            ? "absolute top-49 left-59 origin-top-left scale-91"
            : "absolute top-113.75 left-66"
        }
      />
    </>
  );
}

function MobileNdpc() {
  return (
    <article className="relative h-424 w-362 shrink-0 snap-start overflow-clip rounded-u-30 bg-jumpa-surface text-jumpa-ink">
      <div className="absolute top-103 -left-171 flex h-347.5 w-362 items-center justify-center">
        <Art
          src={`${IMG}/ndpc-wave-a.svg`}
          className="h-208 w-297 flex-none rotate-[38.37deg]"
        />
      </div>
      <div className="absolute top-102 left-180 flex h-347.5 w-362 items-center justify-center">
        <Art
          src={`${IMG}/ndpc-wave-b.svg`}
          className="h-208 w-297 flex-none -scale-y-100 rotate-[141.63deg]"
        />
      </div>
      <Image
        src={`${IMG}/ndpc-shield.webp`}
        width={400}
        height={400}
        sizes="(min-width: 768px) 1px, 34vw"
        alt=""
        className="absolute top-27 left-115.5 size-130.5"
      />
      <Art
        src={`${IMG}/ndpc-base.svg`}
        className="absolute top-152.5 left-92.75 h-56.75 w-175.75"
      />
      <h3 className="absolute top-246 left-24 w-314 font-semibold text-u-24/25.5 -tracking-u-0.75">
        {SECURITY.ndpc.title}
      </h3>
      <p className="absolute top-286 left-24 w-314 text-u-14/23 -tracking-u-0.5">
        {SECURITY.ndpc.body}
      </p>
    </article>
  );
}

export function SecuritySection() {
  return (
    <section
      id="security"
      className="-mt-36 scroll-mt-65 md:mt-0 md:scroll-mt-95"
    >
      <div className="relative mx-auto h-774 w-402 md:h-1429 md:w-1440">
        <SectionBadge className="reveal absolute top-56 left-21 md:top-87 md:left-107">
          {SECURITY.badge}
        </SectionBadge>
        <h2
          style={revealStep(1)}
          className="reveal absolute inset-x-20 top-100 font-semibold text-jumpa-ink text-u-32/37.25 -tracking-u-1.75 md:top-201 md:right-auto md:left-103 md:w-548 md:text-u-60/70 md:-tracking-u-3.25"
        >
          {SECURITY.heading}
        </h2>
        <p
          style={revealStep(2)}
          className="reveal absolute inset-x-20 top-194 font-medium text-jumpa-black text-u-14/21.75 -tracking-u-0.5 md:top-275.5 md:right-auto md:left-955 md:w-393 md:text-u-20/31"
        >
          {SECURITY.subhead}
        </p>

        <div className="hidden md:contents">
          {SECURITY.cards.map((card, i) => (
            <article
              key={card.id}
              style={revealStep(i + 3)}
              className={cn(
                "reveal absolute top-381 h-594 w-394 overflow-clip rounded-u-30 text-jumpa-ink",
                DESKTOP_LEFT[card.id],
              )}
            >
              <CardArt id={card.id} />
              <h3
                className={cn(
                  BLOCK,
                  "font-semibold text-u-32/34 -tracking-u-1",
                  DESKTOP_TEXT[card.id].title,
                )}
              >
                {card.title}
              </h3>
              <p
                className={cn(
                  BLOCK,
                  "text-u-17/23.25 -tracking-u-0.5 opacity-85",
                  DESKTOP_TEXT[card.id].body,
                )}
              >
                {card.body}
              </p>
            </article>
          ))}

          <article
            style={revealStep(6)}
            className="reveal absolute top-999 left-107 h-318 w-1226 overflow-clip rounded-u-30 bg-jumpa-surface text-jumpa-ink"
          >
            <Image
              src={`${IMG}/security-ndpc.webp`}
              width={2452}
              height={636}
              sizes="(min-width: 1440px) 1226px, 85vw"
              alt=""
              className="absolute inset-0 size-full object-cover"
            />
            <h3
              className={cn(
                BLOCK,
                "top-106 left-402 font-semibold text-u-32/34 -tracking-u-1",
              )}
            >
              {SECURITY.ndpc.title}
            </h3>
            <p
              className={cn(
                BLOCK,
                "top-180.5 left-402 h-67 w-604 text-u-17/28 -tracking-u-0.5 opacity-85",
              )}
            >
              {SECURITY.ndpc.body}
            </p>
          </article>
        </div>

        <SnapCarousel
          label={SECURITY.badge}
          count={SECURITY.cards.length + 1}
          className="reveal absolute inset-x-0 top-258 md:hidden"
          trackClassName="scroll-px-20 gap-31 px-20"
        >
          {SECURITY.cards.map((card) => (
            <article
              key={card.id}
              className={cn(
                "relative h-424 w-362 shrink-0 snap-start overflow-clip rounded-u-30 text-jumpa-ink",
                card.id === "access"
                  ? "bg-[image:var(--gradient-jumpa-security-card-mobile)]"
                  : "bg-jumpa-surface",
              )}
            >
              <CardArt id={card.id} mobile />
              <h3
                className={cn(
                  "absolute top-286 left-29 font-semibold text-u-22/23.5 -tracking-u-0.75",
                  MOBILE_TEXT[card.id].title,
                )}
              >
                {card.title}
              </h3>
              <p
                className={cn(
                  "absolute top-317 left-29 text-u-14/19 -tracking-u-0.5",
                  MOBILE_TEXT[card.id].body,
                )}
              >
                {card.body}
              </p>
            </article>
          ))}
          <MobileNdpc />
        </SnapCarousel>
      </div>
    </section>
  );
}
