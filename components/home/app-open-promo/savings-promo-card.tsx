import Image from "next/image";
import {
  PROMO_ART,
  PromoArtboard,
  PromoCta,
  PromoGlow,
  PromoShapes,
} from "@/components/home/app-open-promo/promo-card-parts";

export function SavingsPromoCard({ onStart }: { onStart: () => void }) {
  return (
    <PromoArtboard background="bg-linear-to-b from-jumpa-primary-600 to-jumpa-primary-30 to-[40.392%]">
      <Image
        src={`${PROMO_ART}/savings-popup-chart.webp`}
        alt=""
        width={2172}
        height={724}
        className="pointer-events-none absolute top-148 -left-54 h-78.75 w-236.25 max-w-none object-cover mix-blend-screen"
      />
      <p className="absolute top-163 left-26 flex h-24 w-136 flex-col justify-center text-center text-u-11.5/16 font-medium tracking-jumpa-snug text-jumpa-primary-975">
        <span>
          Save and earn up to{" "}
          <span className="font-bold text-jumpa-primary-600">15%</span> interest
          annually.
        </span>
      </p>
      <PromoGlow className="top-228 -left-4 size-40" />
      <PromoCta href="/savings" onClick={onStart}>
        Start Saving
      </PromoCta>
      <Image
        src={`${PROMO_ART}/savings-popup-piggy.webp`}
        alt=""
        width={1024}
        height={820}
        className="pointer-events-none absolute top-41 -left-9 h-125.25 w-191 max-w-none"
      />
      <span className="pointer-events-none absolute top-18 left-17 flex h-30.5 w-154 items-center justify-center">
        <span className="rotate-[-0.22deg] -skew-x-6 scale-y-99 text-u-12.5/19 font-bold tracking-jumpa-tighter whitespace-nowrap text-jumpa-white">
          Put your money to work!
        </span>
      </span>
      <Image
        src={`${PROMO_ART}/savings-popup-badge.webp`}
        alt=""
        width={1024}
        height={353}
        className="pointer-events-none absolute top-61 left-59 h-14.25 w-41 max-w-none object-cover"
      />
      <PromoShapes className="top-210 left-119 h-99 w-107" />
    </PromoArtboard>
  );
}
