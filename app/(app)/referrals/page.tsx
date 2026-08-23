import type { Metadata } from "next";
import Image from "next/image";
import { CopyButton } from "@/components/auth/copy-button";
import { PromotionList } from "@/components/home/promotion-list";
import { SettingLink, SettingRow } from "@/components/settings/setting-row";
import {
  SettingCard,
  SettingRule,
  SettingSection,
} from "@/components/settings/setting-section";
import { SettingsHeader } from "@/components/settings/settings-header";
import { Button } from "@/components/ui/button";
import { PartyBellIcon } from "@/components/ui/icons/party-bell";
import { UsersIcon } from "@/components/ui/icons/users";
import { PROFILE, PROMOTIONS, REFERRALS } from "@/lib/wallet";

export const metadata: Metadata = { title: "Referrals" };

export default function ReferralsPage() {
  return (
    <div className="flex flex-col px-4.5 pt-[calc(env(safe-area-inset-top)+21px)] pb-12">
      <SettingsHeader back="/profile/settings" title="Referrals" />

      <section className="mt-6 flex flex-col gap-2">
        <div className="relative isolate flex h-28.25 flex-col items-center justify-center overflow-hidden rounded-card bg-[image:var(--gradient-jumpa-hero)]">
          <Image
            src="/images/home/hero-grid.svg"
            alt=""
            width={287}
            height={264}
            className="pointer-events-none absolute -z-10 max-w-none opacity-40"
          />

          <span className="flex h-4.5 items-center rounded-pill bg-jumpa-primary-950 px-2.75 text-[10px] leading-2.5 font-medium text-jumpa-white">
            Referral Earnings
          </span>
          {/* The 26px digits set the line; the strut and "$" must not extend it. */}
          <p className="mt-2 leading-0 font-bold text-jumpa-white">
            <span className="text-base leading-none">$</span>
            <span className="text-[26px] leading-6.5">
              {REFERRALS.earnings}
            </span>
          </p>

          <span className="absolute top-3 right-2.5 flex h-8.5 items-center rounded-pill bg-jumpa-white/25 px-2.75 text-xs leading-3 font-medium text-jumpa-white">
            {REFERRALS.invited}/{REFERRALS.target} Invited
          </span>
        </div>

        <Button variant="brand" size="sm" className="text-sm">
          Claim Earnings
        </Button>
      </section>

      <div className="mt-4.25 flex flex-col">
        <SettingSection label="Referral Methods">
          <SettingCard>
            <SettingRow
              icon={UsersIcon}
              label="Your Referral Code"
              value={PROFILE.referralCode}
              action={<CopyButton value={PROFILE.referralCode} />}
            />
            <SettingRule />
            <SettingRow
              icon={UsersIcon}
              label="Your Referral Link"
              value={PROFILE.referralLink}
              action={<CopyButton value={PROFILE.referralLink} />}
            />
            <SettingRule />
            <SettingLink
              href="/referrals"
              icon={PartyBellIcon}
              label="Invite friends to Jumpa and earn rewards"
              brand
            />
          </SettingCard>
        </SettingSection>

        <div className="mt-3.75">
          <PromotionList promotions={PROMOTIONS} />
        </div>

        <section className="mt-4.75 flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm leading-4 font-medium text-jumpa-black">
              Referral History
            </h2>
            <span className="text-xs leading-3.5 text-jumpa-neutral-350">
              {REFERRALS.invited} Invited
            </span>
          </div>
          {/* No rows are drawn in the design — the empty tile is the state. */}
          <div className="h-25 rounded-card bg-jumpa-neutral-50" />
        </section>
      </div>
    </div>
  );
}
