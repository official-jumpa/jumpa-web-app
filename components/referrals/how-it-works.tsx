import { ReferralStepList } from "@/components/referrals/referral-steps";
import {
  SettingCard,
  SettingSection,
} from "@/components/settings/setting-section";
import type { CampaignStatus } from "@/lib/referrals/campaign";
import { formatRewardNaira, REFERRAL_REWARD_NGN } from "@/lib/referrals/rules";

const STATUS_NOTE: Record<CampaignStatus, string | null> = {
  off: "Referral rewards haven't started yet.",
  upcoming: "Referral rewards haven't started yet.",
  live: null,
  ended:
    "This referral campaign has ended. Rewards you already earned are still yours to claim.",
};

/** The rules in plain words, with the campaign's state when it isn't running. */
export function HowItWorks({
  status,
  endsAt,
}: {
  status: CampaignStatus;
  endsAt: string | null;
}) {
  const note =
    STATUS_NOTE[status] ??
    (endsAt
      ? `Rewards run until ${new Date(endsAt).toLocaleDateString("en-NG", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })}.`
      : null);

  return (
    <SettingSection label="How it works">
      <SettingCard>
        <p className="text-xs leading-4 text-jumpa-neutral-500">
          You get{" "}
          <strong className="font-semibold text-jumpa-black">
            {formatRewardNaira(REFERRAL_REWARD_NGN.referrer)}
          </strong>{" "}
          and your friend gets{" "}
          <strong className="font-semibold text-jumpa-black">
            {formatRewardNaira(REFERRAL_REWARD_NGN.referred)}
          </strong>{" "}
          once they:
        </p>
        <ReferralStepList perspective="referrer" />
        <p className="text-2xs leading-3.5 text-jumpa-neutral-400">
          Each friend earns you a reward once. Claim your earnings into your
          Naira wallet any time.
          {note ? ` ${note}` : ""}
        </p>
      </SettingCard>
    </SettingSection>
  );
}
