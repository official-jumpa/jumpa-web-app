import Image from "next/image";
import {
  PROMO_ART,
  PromoArtboard,
  PromoCta,
  PromoGlow,
  PromoHaze,
  PromoShapes,
} from "@/components/home/app-open-promo/promo-card-parts";

/** For a referred friend who hasn't been paid yet; their progress lives on /referrals. */
export function RewardPromoCard({ onStart }: { onStart: () => void }) {
  return (
    <PromoArtboard background="bg-jumpa-primary-30 bg-linear-to-b from-jumpa-primary-600/40 to-transparent to-[14%]">
      <PromoGlow className="top-228 -left-4 size-40" />
      <PromoCta href="/referrals" onClick={onStart}>
        Claim now
      </PromoCta>
      <span className="pointer-events-none absolute top-18 left-46 flex h-33.75 w-88.25 items-center justify-center">
        <span className="w-85 rotate-[-0.22deg] -skew-x-6 scale-y-99 text-center text-u-13.75/13.25 font-bold -tracking-u-0.75 text-jumpa-ink">
          Your reward
          <span className="block text-jumpa-primary-600">is waiting!!!</span>
        </span>
      </span>
      <PromoShapes className="top-210 left-119 h-99 w-107 rotate-[3.08deg]" />
      <span className="pointer-events-none absolute top-63.25 left-110.25 size-118.5 rounded-full bg-jumpa-primary-600/20" />
      <PromoHaze />
      <Image
        src={`${PROMO_ART}/reward-popup-gift.webp`}
        alt=""
        width={720}
        height={658}
        sizes="234px"
        className="pointer-events-none absolute top-57 left-21 h-129.75 w-142 max-w-none"
      />
      <p className="absolute top-180 left-35 flex h-23 w-110 flex-col justify-center text-center text-u-11/11.5 font-medium -tracking-u-0.5 text-jumpa-primary-975">
        You’re few steps away from your reward.
      </p>
    </PromoArtboard>
  );
}
