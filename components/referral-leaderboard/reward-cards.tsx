import { GiftIcon } from "@/components/ui/icons/gift";
import { TrophyIcon } from "@/components/ui/icons/trophy";
import { UserPlusIcon } from "@/components/ui/icons/user-plus";
import { cn } from "@/lib/cn";
import { REFERRAL_CHALLENGE } from "@/lib/landing";

// In `REFERRAL_CHALLENGE.rewards` order; the last card is the highlighted total.
const ICONS = [UserPlusIcon, GiftIcon, TrophyIcon] as const;

/** What each side earns, and the total per referral. */
export function RewardCards() {
  const { rewards } = REFERRAL_CHALLENGE;
  return (
    <ul className="mt-28 flex w-362 flex-col gap-12 md:mt-53 md:w-1045 md:flex-row md:gap-26">
      {rewards.map((reward, index) => {
        const featured = index === rewards.length - 1;
        const Icon = ICONS[index];
        return (
          <li
            key={reward.label}
            className={cn(
              "relative flex h-130 flex-col justify-between rounded-u-18 p-22 md:h-159 md:flex-1 md:rounded-u-22 md:p-28",
              featured
                ? "bg-linear-to-br from-jumpa-primary-600 to-jumpa-primary-400 text-jumpa-white"
                : "border-u-1 border-jumpa-lavender-200 bg-jumpa-white text-jumpa-ink",
            )}
          >
            <span
              className={cn(
                "absolute top-18 right-18 flex size-38 items-center justify-center rounded-u-10 md:top-22 md:right-22 md:size-44 md:rounded-u-12",
                featured
                  ? "bg-jumpa-white/15 text-jumpa-white"
                  : "bg-jumpa-primary-50 text-jumpa-primary-600",
              )}
            >
              <Icon className="size-20 md:size-22" />
            </span>
            <span
              className={cn(
                "font-semibold uppercase text-u-11/14 tracking-u-0.8 md:text-u-12/16",
                featured ? "text-jumpa-white/80" : "text-jumpa-ink-muted",
              )}
            >
              {reward.label}
            </span>
            <span
              className={cn(
                "font-bold text-u-40/46 -tracking-u-1 md:text-u-50/58 md:-tracking-u-1.5",
                featured && "text-jumpa-alt-400",
              )}
            >
              {reward.amount}
            </span>
            <span
              className={cn(
                "text-u-13/18 md:text-u-14/20",
                featured ? "text-jumpa-white/85" : "text-jumpa-ink-muted",
              )}
            >
              {reward.caption}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
