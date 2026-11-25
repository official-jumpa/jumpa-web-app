import { GiftIcon } from "@/components/ui/icons/gift";
import { TrophyIcon } from "@/components/ui/icons/trophy";
import { UserPlusIcon } from "@/components/ui/icons/user-plus";
import { cn } from "@/lib/cn";
import { REFERRAL_CHALLENGE } from "@/lib/landing";

// In `REFERRAL_CHALLENGE.rewards` order; the last card is the highlighted total.
const ICONS = [UserPlusIcon, GiftIcon, TrophyIcon] as const;

/** What each side earns: one purple card in three columns on phones, three cards on desktop. */
export function RewardCards() {
  const { rewards } = REFERRAL_CHALLENGE;
  return (
    <ul className="mt-30 flex h-140 w-354 rounded-u-28 bg-linear-to-r from-jumpa-primary-450 to-jumpa-primary-600 shadow-lift-u-12/15 shadow-jumpa-primary-600/28 md:mt-52 md:h-160 md:w-auto md:gap-24 md:rounded-none md:bg-none md:shadow-none">
      {rewards.map((reward, index) => {
        const featured = index === rewards.length - 1;
        const Icon = ICONS[index];
        return (
          <li
            key={reward.label}
            className={cn(
              "relative flex w-118 flex-col items-center pt-24 text-center md:w-330 md:items-start md:rounded-u-28 md:pt-25 md:pl-27 md:text-left md:shadow-lift-u-12/16",
              featured
                ? "md:bg-linear-to-r md:from-jumpa-primary-450 md:to-jumpa-primary-600 md:shadow-jumpa-primary-600/25"
                : "md:bg-jumpa-white md:inset-ring md:inset-ring-jumpa-secondary-150 md:shadow-jumpa-primary-600/7",
            )}
          >
            {index > 0 && (
              <span
                aria-hidden="true"
                className="absolute top-28 left-0 h-84 w-px bg-jumpa-white/25 md:hidden"
              />
            )}
            <span
              className={cn(
                "font-semibold text-jumpa-alt-400 uppercase text-u-10/14 tracking-u-0.75 md:text-u-12/16 md:tracking-u-1",
                featured
                  ? "md:text-jumpa-secondary-150"
                  : "md:text-jumpa-ink-muted",
              )}
            >
              <span className="md:hidden">{reward.shortLabel}</span>
              <span className="hidden md:inline">{reward.label}</span>
            </span>
            <span
              className={cn(
                "mt-6 font-extrabold text-u-30/38 -tracking-u-1 md:text-u-54/62 md:-tracking-u-2.75",
                featured
                  ? "text-jumpa-alt-400"
                  : "text-jumpa-white md:text-jumpa-ink",
              )}
            >
              {reward.amount}
            </span>
            <span
              className={cn(
                "mt-6 w-98 text-jumpa-white text-u-12/17 -tracking-u-0.25 md:mt-8 md:w-280 md:text-u-15/22 md:-tracking-u-0.25",
                !featured && "md:text-jumpa-ink-muted",
              )}
            >
              <span className="md:hidden">{reward.shortCaption}</span>
              <span className="hidden md:inline">{reward.caption}</span>
            </span>
            <span
              aria-hidden="true"
              className={cn(
                "absolute top-23 right-29 hidden size-44 items-center justify-center rounded-u-14 md:flex",
                featured
                  ? "bg-jumpa-white/18 text-jumpa-white"
                  : "bg-jumpa-primary-50 text-jumpa-primary-600",
              )}
            >
              <Icon className="size-22" />
            </span>
          </li>
        );
      })}
    </ul>
  );
}
