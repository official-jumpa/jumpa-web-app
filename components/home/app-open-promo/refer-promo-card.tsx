import Image from "next/image";
import {
  PROMO_ART,
  PromoArtboard,
  PromoCta,
  PromoGlow,
  PromoHaze,
  PromoShapes,
} from "@/components/home/app-open-promo/promo-card-parts";
import { AccountGroupIcon } from "@/components/ui/icons/account-group";
import { REFERRAL_REWARD_NGN } from "@/lib/referrals/rules";

export function ReferPromoCard({ onStart }: { onStart: () => void }) {
  return (
    <PromoArtboard background="bg-jumpa-primary-30 bg-linear-to-b from-jumpa-primary-600/60 to-transparent to-[36%]">
      <PromoGlow className="top-217 left-134 size-40" />
      <PromoGlow className="top-39 left-40 size-106" />
      <PromoCta href="/referrals" onClick={onStart}>
        Refer now
      </PromoCta>
      <span className="pointer-events-none absolute top-10 left-18 flex h-31 w-153.25 items-center justify-center">
        <span className="rotate-[-0.22deg] -skew-x-6 scale-y-99 text-u-12.75/12.25 font-bold -tracking-u-0.75 whitespace-nowrap text-jumpa-white">
          Refer friends, earn rewards
        </span>
      </span>
      <PromoShapes className="top-212.5 -left-48.5 h-99 w-97.75 -scale-x-100 rotate-[3.11deg]" />
      <span className="pointer-events-none absolute top-197.25 left-155.25 size-46.75 rounded-full bg-jumpa-primary-600/20" />
      <PromoHaze />
      {/* The art reads "Earn 500": re-export it if the referrer reward changes. */}
      <span className="pointer-events-none absolute top-50.5 -left-2.25 h-117 w-169.75 rotate-[-1.69deg] overflow-hidden">
        <Image
          src={`${PROMO_ART}/refer-popup-banner.webp`}
          alt=""
          width={900}
          height={600}
          sizes="290px"
          className="h-117 w-175.5 max-w-none"
        />
      </span>
      <span className="pointer-events-none absolute top-173 left-11 h-30 w-160 rounded-u-20 bg-jumpa-primary-100/20" />
      <p className="absolute top-175 left-18.25 flex h-24 w-139.75 flex-col items-center justify-center whitespace-nowrap text-center font-medium -tracking-u-0.25 text-jumpa-primary-950">
        <span className="text-u-8/9.75">
          <span className="font-semibold text-jumpa-primary-600">
            Each referral
          </span>
          :
        </span>
        <span className="text-u-9/9.75">
          <span className="font-semibold text-jumpa-primary-600">
            {REFERRAL_REWARD_NGN.referrer.toLocaleString("en-NG")}
          </span>{" "}
          for you and{" "}
          <span className="font-semibold text-jumpa-primary-600">
            {REFERRAL_REWARD_NGN.referred.toLocaleString("en-NG")}
          </span>{" "}
          for your friend
        </span>
      </p>
      <span className="pointer-events-none absolute top-166 left-12 flex size-18 items-center justify-center">
        <AccountGroupIcon className="size-8.25 text-jumpa-primary-600" />
      </span>
    </PromoArtboard>
  );
}
