import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { CopyButton } from "@/components/auth/copy-button";
import { SettingLink, SettingRow } from "@/components/settings/setting-row";
import {
  SettingCard,
  SettingRule,
  SettingSection,
} from "@/components/settings/setting-section";
import { SettingsHeader } from "@/components/settings/settings-header";
import { CornerUpRightIcon } from "@/components/ui/icons/corner-up-right";
import { GearIcon } from "@/components/ui/icons/gear";
import { PartyBellIcon } from "@/components/ui/icons/party-bell";
import { TagsIcon } from "@/components/ui/icons/tags";
import { UserAlt1Icon } from "@/components/ui/icons/user-alt-1";
import { UsersIcon } from "@/components/ui/icons/users";
import { VerifiedBadgeIcon } from "@/components/ui/icons/verified-badge";
import { ACCOUNT, PROFILE } from "@/lib/wallet";

export const metadata: Metadata = { title: "Your Profile" };

export default function ProfilePage() {
  const { completed, total } = ACCOUNT.kyc;

  return (
    <div className="flex flex-col px-4.5 pt-[calc(env(safe-area-inset-top)+21px)] pb-12">
      <SettingsHeader
        back="/home"
        title="Your Profile"
        action={
          <Link
            href="/profile/settings"
            aria-label="Settings"
            className="flex size-11 items-center justify-center rounded-pill bg-jumpa-neutral-50 text-jumpa-primary-950 tap active:scale-95"
          >
            <GearIcon className="size-6" />
          </Link>
        }
      />

      <div className="mt-7.25 flex flex-col items-center">
        <span className="relative">
          <Image
            src={ACCOUNT.avatar}
            alt=""
            width={160}
            height={160}
            className="size-20 rounded-full object-cover"
          />
          {ACCOUNT.verified ? (
            <VerifiedBadgeIcon className="absolute -top-0.5 -right-0.5 size-5.5" />
          ) : null}
        </span>

        <p className="mt-3.75 text-sm leading-4 font-semibold text-jumpa-black">
          {PROFILE.handle}
        </p>
        <p className="mt-2 text-[10px] leading-3 font-medium text-jumpa-primary-600">
          {PROFILE.email}
        </p>
        <CopyButton
          value={PROFILE.walletAddress}
          label="Copy wallet address"
          variant="text"
          className="mt-1 text-[10px] leading-3 font-semibold"
        />
      </div>

      <Link
        href="/kyc"
        className="mt-6 flex items-center gap-1.5 rounded-surface border border-jumpa-neutral-60 bg-jumpa-neutral-50 px-3.25 py-4 tap active:scale-[0.99]"
      >
        <span className="flex size-11 shrink-0 items-center justify-center rounded-pill bg-jumpa-primary-600 text-jumpa-white">
          <UserAlt1Icon className="size-6" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="text-sm leading-4 font-semibold text-jumpa-primary-950">
            Complete your KYC ({completed}/{total})
          </span>
          <span className="text-[10px] leading-3.25 text-jumpa-neutral-350">
            Verify your identity to unlock all features and keep your account
            secure.
          </span>
        </span>
        <CornerUpRightIcon className="size-6 shrink-0 text-jumpa-primary-950" />
      </Link>

      <div className="mt-4.25 flex flex-col gap-4">
        <SettingSection label="Your wallet Information">
          <SettingCard className="pb-4">
            <SettingRow
              icon={TagsIcon}
              label="Jumpa Tag"
              value={PROFILE.jumpaTag}
              action={<CopyButton value={PROFILE.jumpaTag} />}
            />
            <SettingRule />
            <SettingRow
              icon={TagsIcon}
              label="Wallet Address"
              value={PROFILE.walletAddress}
              action={<CopyButton value={PROFILE.walletAddress} />}
            />

            <span className="flex items-center justify-center gap-2">
              <span className="text-xs leading-3 text-jumpa-black">
                Powered by
              </span>
              <span className="flex items-center gap-1 rounded-pill bg-jumpa-neutral-95 px-1.25 py-1.25">
                <Image
                  src="/images/home/coin-generic.svg"
                  alt=""
                  width={22}
                  height={22}
                  className="size-5.5"
                />
                <span className="flex flex-col pr-1">
                  <span className="text-xs leading-3 font-semibold text-jumpa-black">
                    XLM
                  </span>
                  <span className="text-[8px] leading-2 text-jumpa-neutral-350">
                    Stellar
                  </span>
                </span>
              </span>
            </span>
          </SettingCard>
        </SettingSection>

        {/* The design repeats this heading; kept verbatim. */}
        <SettingSection label="Your wallet Information">
          <SettingCard>
            <SettingRow
              icon={UsersIcon}
              label="Your Referral Code"
              value={PROFILE.referralCode}
              action={<CopyButton value={PROFILE.referralCode} />}
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
      </div>
    </div>
  );
}
