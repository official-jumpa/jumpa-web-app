"use client";

import Image from "next/image";
import { CopyButton } from "@/components/auth/copy-button";
import { SettingLink, SettingRow } from "@/components/settings/setting-row";
import {
  SettingCard,
  SettingRule,
  SettingSection,
} from "@/components/settings/setting-section";
import { SettingsHeader } from "@/components/settings/settings-header";
import { SupportOptionList } from "@/components/support/support-options";
import { FileIcon } from "@/components/ui/icons/file";
import { ShieldCheckIcon } from "@/components/ui/icons/shield-check";
import { legalHref } from "@/lib/legal";
import { formatStable } from "@/lib/naira-deposit";
import type { AccountSummary } from "@/lib/nimiq/orders";
import { formatUsd } from "@/lib/token-amount";
import { shortenAddress } from "@/lib/transfer";
import { ACCOUNT } from "@/lib/wallet";
import { NIMIQ_SUPPORT_OPTIONS } from "./nimiq-support";
import { MINI_APP_PATH } from "./use-mini-app-nav";

const COIN = "size-6 shrink-0 rounded-full object-contain";

/** The Me tab: the connected wallet, today's limit, help and the legal pages. */
export function NimiqMe({
  address,
  account,
  onBack,
}: {
  address: string;
  account?: AccountSummary;
  onBack: () => void;
}) {
  return (
    <div className="flex flex-col px-4.5 pt-[calc(env(safe-area-inset-top)+21px)] pb-6">
      <SettingsHeader
        back={MINI_APP_PATH}
        onBack={onBack}
        title="Your wallet"
      />

      <div className="mt-5.25 flex items-center gap-5.5">
        <Image
          src={ACCOUNT.avatar}
          alt=""
          width={160}
          height={160}
          priority
          unoptimized
          className="size-20 shrink-0 rounded-full object-cover"
        />
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-base leading-4 font-semibold tracking-jumpa-snug text-jumpa-black">
            {shortenAddress(address, 6, 4)}
          </span>
          <span className="mt-1.5 truncate text-xs leading-3 font-medium tracking-jumpa-snug text-jumpa-grey-450">
            Nimiq Pay wallet on Polygon
          </span>
        </span>
      </div>

      <div className="mt-6 flex flex-col gap-4">
        <SettingSection label="Your wallet Information">
          <SettingCard>
            <SettingRow
              icon={
                <Image
                  src="/coins/pol.webp"
                  alt="Polygon"
                  width={24}
                  height={24}
                  className={COIN}
                />
              }
              label="Wallet Address (Polygon)"
              value={shortenAddress(address, 6, 4)}
              action={<CopyButton value={address} name="Copy wallet address" />}
            />
            <SettingRule />
            <SettingRow
              icon={
                <Image
                  src="/coins/usdt.webp"
                  alt="USDT"
                  width={24}
                  height={24}
                  className={COIN}
                />
              }
              label="USDT balance"
              value={
                account ? `${formatStable(account.usdtBalance)} USDT` : "—"
              }
            />
            <SettingRule />
            <SettingRow
              icon={ShieldCheckIcon}
              label="Today's limit"
              value={
                account
                  ? `${formatUsd(account.remainingTodayUsd)} left of ${formatUsd(account.limits.dailyUsd)}`
                  : "—"
              }
            />
          </SettingCard>
        </SettingSection>

        <SettingSection label="Help and support">
          <SupportOptionList options={NIMIQ_SUPPORT_OPTIONS} />
        </SettingSection>

        <SettingSection label="Legal">
          <SettingCard>
            <SettingLink
              href={legalHref("terms")}
              icon={FileIcon}
              label="Terms of Service"
            />
            <SettingRule />
            <SettingLink
              href={legalHref("privacy")}
              icon={FileIcon}
              label="Privacy Policy"
            />
          </SettingCard>
        </SettingSection>
      </div>

      <p className="mt-6 text-center text-xs leading-4 text-jumpa-neutral-400">
        Your keys stay in Nimiq Pay. Nothing leaves your wallet without your
        approval there.
      </p>
    </div>
  );
}
