import { ReferralStepList } from "@/components/referrals/referral-steps";
import { SettingCard } from "@/components/settings/setting-section";
import { Button } from "@/components/ui/button";
import { formatRewardNaira } from "@/lib/referrals/rules";

/** For a user who joined with an invite: what's left before both sides are paid. */
export function WelcomeRewardCard({
  verified,
  reward,
}: {
  /** KYC is done; only the trade is left. */
  verified: boolean;
  reward: number;
}) {
  return (
    <SettingCard>
      <div className="flex flex-col gap-1">
        <h2 className="text-sm leading-4 font-semibold text-jumpa-black">
          Your {formatRewardNaira(reward)} welcome reward
        </h2>
        <p className="text-xs leading-4 text-jumpa-neutral-500">
          You joined with a friend&apos;s invite. Finish these steps to unlock
          it for both of you.
        </p>
      </div>
      <ReferralStepList perspective="referred" done={verified ? 2 : 1} />
      <Button
        href={verified ? "/receive?rail=fiat" : "/kyc"}
        variant="brand"
        size="compact"
      >
        {verified ? "Buy USDC or USDT" : "Verify my identity"}
      </Button>
    </SettingCard>
  );
}
