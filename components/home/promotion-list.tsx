import Image from "next/image";
import Link from "next/link";
import { CornerUpRightIcon } from "@/components/ui/icons/corner-up-right";
import type { Promotion } from "@/lib/wallet";

const TONES = {
  lime: {
    surface: "bg-[image:var(--gradient-jumpa-promo-lime)]",
    text: "text-jumpa-alt-950",
    backdrop: "/images/home/promo-lime-bg.svg",
  },
  purple: {
    surface: "bg-[image:var(--gradient-jumpa-promo-purple)]",
    text: "text-jumpa-white",
    backdrop: "/images/home/promo-purple-bg.svg",
  },
} as const;

/** Scrolling row of offer cards, shown in place of the KYC nudge. */
export function PromotionList({ promotions }: { promotions: Promotion[] }) {
  return (
    <ul className="-mx-4.5 flex snap-x scroll-pl-4.5 gap-2 overflow-x-auto px-4.5 [scrollbar-width:none]">
      {promotions.map((promotion) => {
        const tone = TONES[promotion.tone];

        return (
          <li key={promotion.id} className="shrink-0 snap-start">
            <Link
              href={promotion.href}
              className={`relative block h-20 w-61.25 overflow-hidden rounded-panel ${tone.surface}`}
            >
              <Image
                src={tone.backdrop}
                alt=""
                width={288}
                height={106}
                className="pointer-events-none absolute -top-3.5 -left-5.5 w-72 max-w-none"
              />
              <Image
                src="/images/home/promo-percent.svg"
                alt=""
                width={101}
                height={107}
                className="pointer-events-none absolute top-0.5 left-37.5 h-26.75 max-w-none"
              />
              <span className="absolute top-0.75 left-51 flex size-7.5 items-center justify-center rounded-full border border-jumpa-black bg-jumpa-white text-jumpa-primary-950">
                <CornerUpRightIcon className="size-4.5" />
              </span>

              <span
                className={`absolute top-4.5 left-3 flex w-34.5 flex-col gap-0.5 ${tone.text}`}
              >
                <span className="text-sm leading-4">
                  <span className="font-extrabold">{promotion.highlight}</span>
                  {promotion.title}
                  <span className="font-extrabold">{promotion.brand}</span>
                </span>
                <span className="text-[8px] leading-2.5">
                  {promotion.description}
                </span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
