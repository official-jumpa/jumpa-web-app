"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { CopyButton } from "@/components/auth/copy-button";
import { SettingLink, SettingRow } from "@/components/settings/setting-row";
import {
  SettingCard,
  SettingRule,
  SettingSection,
} from "@/components/settings/setting-section";
import { SettingsHeader } from "@/components/settings/settings-header";
import { ChevronDownIcon } from "@/components/ui/icons/chevron-down";
import { CornerUpRightIcon } from "@/components/ui/icons/corner-up-right";
import { GearIcon } from "@/components/ui/icons/gear";
import { PartyBellIcon } from "@/components/ui/icons/party-bell";
import { TagsIcon } from "@/components/ui/icons/tags";
import { UserAlt1Icon } from "@/components/ui/icons/user-alt-1";
import { UsersIcon } from "@/components/ui/icons/users";
import { VerifiedBadgeIcon } from "@/components/ui/icons/verified-badge";
import { getAssetLogo } from "@/lib/assets";
import { useSession } from "@/lib/auth-client";
import { ACCOUNT } from "@/lib/wallet";

export default function ProfilePage() {
  const { data: session, isPending } = useSession();
  const [walletAddresses, setWalletAddresses] = useState<{
    xlm?: string;
    base?: string;
    eth?: string;
    sol?: string;
    btc?: string;
    [key: string]: string | undefined;
  } | null>(null);
  const [showOtherChains, setShowOtherChains] = useState(false);

  useEffect(() => {
    async function fetchWallet() {
      try {
        const res = await fetch("/api/wallet/balance");
        if (res.ok) {
          const data = await res.json();
          if (data.addresses) {
            setWalletAddresses(data.addresses);
          } else if (data.address) {
            setWalletAddresses({ xlm: data.address });
          }
        }
      } catch (err) {
        console.error("[ProfilePage] Failed to fetch wallet:", err);
      }
    }
    fetchWallet();
  }, []);

  const { completed, total } = ACCOUNT.kyc;

  const user = session?.user as any;

  // Fallbacks while loading or if data is empty
  const displayName = user?.name || user?.jumpaTag || ACCOUNT.firstName;
  const displayEmail = user?.email || "";
  const jumpaTag = user?.jumpaTag || "user@jumpa";
  const referralCode = user?.referralCode || "JUMPA";

  const stellarAddress = walletAddresses?.xlm || "";
  const evmAddress = walletAddresses?.base || walletAddresses?.eth || "";
  const solanaAddress = walletAddresses?.sol || "";
  const btcAddress = walletAddresses?.btc || "";

  const formatAddress = (addr: string) => {
    if (!addr) return "";
    if (addr.length <= 40) return addr;
    return `${addr.slice(0, 18)}...${addr.slice(-18)}`;
  };

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
            src={user?.image || ACCOUNT.avatar}
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
          {displayName}
        </p>
        <p className="mt-2 text-[10px] leading-3 font-medium text-jumpa-primary-600">
          {displayEmail}
        </p>
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
              value={jumpaTag}
              action={<CopyButton value={jumpaTag} />}
            />
            <SettingRule />

            {/* Default Stellar Address */}
            <SettingRow
              icon={
                <Image
                  src={getAssetLogo("XLM")}
                  alt="Stellar"
                  width={24}
                  height={24}
                  className="size-6 shrink-0 rounded-full object-contain"
                />
              }
              label="Wallet Address (Stellar)"
              value={formatAddress(stellarAddress)}
              action={<CopyButton value={stellarAddress} />}
            />

            {/* Toggle to expand other chain addresses */}
            {walletAddresses && (
              <>
                <button
                  type="button"
                  onClick={() => setShowOtherChains(!showOtherChains)}
                  className="mt-2 flex w-full items-center justify-between py-1.5 text-left text-xs font-semibold text-jumpa-primary-600 transition-colors tap active:opacity-80"
                >
                  <span>
                    {showOtherChains
                      ? "Hide other addresses"
                      : "Show other addresses"}
                  </span>
                  <ChevronDownIcon
                    className={`size-4.5 transition-transform duration-200 ${
                      showOtherChains ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {showOtherChains && (
                  <div className="mt-2 flex flex-col gap-3 border-t border-jumpa-neutral-60 pt-3">
                    {evmAddress && (
                      <>
                        <SettingRow
                          icon={
                            <Image
                              src={getAssetLogo("ETH")}
                              alt="Ethereum / Base"
                              width={24}
                              height={24}
                              className="size-6 shrink-0 rounded-full object-contain"
                            />
                          }
                          label="Base & Ethereum Address (EVM)"
                          value={formatAddress(evmAddress)}
                          action={<CopyButton value={evmAddress} />}
                        />
                        <SettingRule />
                      </>
                    )}

                    {solanaAddress && (
                      <>
                        <SettingRow
                          icon={
                            <Image
                              src={getAssetLogo("SOL")}
                              alt="Solana"
                              width={24}
                              height={24}
                              className="size-6 shrink-0 rounded-full object-contain"
                            />
                          }
                          label="Solana Address"
                          value={formatAddress(solanaAddress)}
                          action={<CopyButton value={solanaAddress} />}
                        />
                        <SettingRule />
                      </>
                    )}

                    {btcAddress && (
                      <SettingRow
                        icon={
                          <Image
                            src={getAssetLogo("BTC")}
                            alt="Bitcoin"
                            width={24}
                            height={24}
                            className="size-6 shrink-0 rounded-full object-contain"
                          />
                        }
                        label="Bitcoin Address"
                        value={formatAddress(btcAddress)}
                        action={<CopyButton value={btcAddress} />}
                      />
                    )}
                  </div>
                )}
              </>
            )}
          </SettingCard>
        </SettingSection>

        <SettingSection label="Referral Information">
          <SettingCard>
            <SettingRow
              icon={UsersIcon}
              label="Your Referral Code"
              value={referralCode}
              action={<CopyButton value={referralCode} />}
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
