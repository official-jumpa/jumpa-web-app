"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CopyButton } from "@/components/auth/copy-button";
import { JumpaTagForm } from "@/components/auth/jumpa-tag-form";
import { EditNicknameSheet } from "@/components/profile/edit-nickname-sheet";
import { SettingsGearLink } from "@/components/profile/settings-gear-link";
import { SheetPortal } from "@/components/ui/sheet-portal";
import {
  SettingAction,
  SettingLink,
  SettingRow,
} from "@/components/settings/setting-row";
import {
  SettingCard,
  SettingRule,
  SettingSection,
} from "@/components/settings/setting-section";
import { SettingsHeader } from "@/components/settings/settings-header";
import { ChevronDownIcon } from "@/components/ui/icons/chevron-down";
import { CornerUpRightIcon } from "@/components/ui/icons/corner-up-right";
import { GlobeIcon } from "@/components/ui/icons/globe";
import { PartyBellIcon } from "@/components/ui/icons/party-bell";
import { PenLineIcon } from "@/components/ui/icons/pen-line";
import { PhoneIcon } from "@/components/ui/icons/phone";
import { ShieldUserIcon } from "@/components/ui/icons/shield-user";
import { TagsIcon } from "@/components/ui/icons/tags";
import { UsersIcon } from "@/components/ui/icons/users";
import { VerifiedFilledIcon } from "@/components/ui/icons/verified-filled";
import { getAssetLogo } from "@/lib/assets";
import { getCanonicalCountryName } from "@/lib/countries";
import { profileHref } from "@/lib/profile";
import { useAuthContext } from "@/components/auth/AuthGuard";
import { useUserProfile } from "@/components/profile/user-profile-provider";
import { ACCOUNT } from "@/lib/wallet";

export interface ProfileViewProps {
  initialUser?: {
    name?: string | null;
    nickname?: string | null;
    email?: string | null;
    jumpaTag?: string | null;
    referralCode?: string | null;
    image?: string | null;
    [key: string]: any;
  } | null;
  initialWalletAddresses?: {
    xlm?: string;
    base?: string;
    eth?: string;
    sol?: string;
    [key: string]: string | undefined;
  } | null;
  initialKycVerified?: boolean;
}

export function ProfileView({
  initialUser,
  initialWalletAddresses = null,
  initialKycVerified = false,
}: ProfileViewProps) {
  const router = useRouter();
  const auth = useAuthContext();
  const { profile, updateProfile, refreshProfile } = useUserProfile();
  const authUser = auth?.user as any;
  const user = {
    ...initialUser,
    ...authUser,
    ...profile,
    nickname: profile?.nickname ?? authUser?.nickname ?? initialUser?.nickname ?? null,
  };

  const [walletAddresses, setWalletAddresses] = useState<{
    xlm?: string;
    base?: string;
    eth?: string;
    sol?: string;
    [key: string]: string | undefined;
  } | null>(initialWalletAddresses);
  const [showOtherChains, setShowOtherChains] = useState(false);
  const [editingNickname, setEditingNickname] = useState(false);
  const [editingTag, setEditingTag] = useState(false);
  const [kycVerified, setKycVerified] = useState<boolean>(initialKycVerified);

  // Fallback client fetch only if server hydration was missing
  useEffect(() => {
    if (initialKycVerified !== undefined) return;

    async function checkKyc() {
      try {
        const res = await fetch("/api/v1/kyc");
        if (res.ok) {
          const data = await res.json();
          const isDone = Boolean(
            data?.isCompleted ||
            data?.status === "approved" ||
            data?.status === "verified",
          );
          setKycVerified(isDone);
        }
      } catch (err) {
        console.warn("[ProfilePage] Failed to fetch KYC status:", err);
      }
    }
    checkKyc();
  }, [initialKycVerified]);

  // Fallback wallet fetch only if server hydration was missing
  useEffect(() => {
    if (initialWalletAddresses) return;

    async function fetchWallet() {
      try {
        const res = await fetch("/api/v1/wallet");
        if (res.ok) {
          const json = await res.json();
          const data = json.data;
          if (data?.addresses) {
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
  }, [initialWalletAddresses]);

  // Fallbacks while loading or if data is empty
  const currentNickname =
    profile?.nickname ?? authUser?.nickname ?? initialUser?.nickname ?? null;
  const displayName =
    currentNickname || profile?.name || user?.name || profile?.jumpaTag || user?.jumpaTag || ACCOUNT.firstName;
  const displayEmail = profile?.email || user?.email || "";
  const currentTag = profile?.jumpaTag || user?.jumpaTag || null;
  const referralCode = (user?.referralCode || "JUMPA").toUpperCase();
  const country = getCanonicalCountryName(user?.country);

  const handleSaveNickname = async (nextNickname: string) => {
    await updateProfile({ nickname: nextNickname });
    router.refresh();
  };

  const handleSaveTag = async (nextTag: string) => {
    auth?.updateUser?.({ jumpaTag: nextTag });
    await refreshProfile();
    router.refresh();
  };

  const stellarAddress = walletAddresses?.xlm || "";
  const evmAddress = walletAddresses?.base || walletAddresses?.eth || "";
  const solanaAddress = walletAddresses?.sol || "";
  const tronAddress = walletAddresses?.trx || walletAddresses?.tron || "";

  const formatAddress = (addr: string) => {
    if (!addr) return "";
    if (addr.length <= 40) return addr;
    return `${addr.slice(0, 18)}...${addr.slice(-18)}`;
  };

  return (
    // No nav clearance here — `BottomNav` renders its own spacer.
    <div className="flex flex-col px-4.5 pt-[calc(env(safe-area-inset-top)+21px)] pb-6">
      <SettingsHeader
        back="/home"
        title="Your Profile"
        action={<SettingsGearLink />}
      />

      <div className="mt-5.25 flex items-start">
        <span className="relative size-20 shrink-0">
          <Image
            src={user?.image || ACCOUNT.avatar}
            alt=""
            width={160}
            height={160}
            className="size-20 rounded-full object-cover"
          />
          {/* TODO(backend): read the account's tier; KYC status stands in for it. */}
          <span className="absolute top-2 left-15 flex h-4.25 items-center whitespace-nowrap rounded-pill border-[1.2px] border-jumpa-white bg-jumpa-alt-400 pr-3 pl-2 text-[8px] leading-none font-semibold text-jumpa-ink">
            Tier {kycVerified ? 2 : 1}
          </span>
        </span>

        <span className="mt-3.25 ml-5.5 flex min-w-0 flex-1 flex-col">
          <span className="truncate text-base leading-4 font-semibold tracking-jumpa-snug text-jumpa-black">
            {displayName}
          </span>
          <span className="mt-1.5 truncate text-xs leading-3 font-medium tracking-jumpa-snug text-jumpa-grey-450">
            {displayEmail}
          </span>
          {kycVerified ? (
            <span className="mt-1 flex items-center gap-0.5 text-[10px] leading-4 font-medium text-jumpa-success">
              <VerifiedFilledIcon className="size-3" />
              KYC Verified
            </span>
          ) : null}
        </span>

        <Link
          prefetch={false}
          href={profileHref("edit")}
          className="mt-2 flex h-5.75 w-14 shrink-0 items-center gap-0.75 rounded-row bg-jumpa-surface pl-2.5 text-xs leading-3 font-medium tracking-jumpa text-jumpa-grey-450 tap active:scale-95"
        >
          <PenLineIcon className="size-2.75" />
          Edit
        </Link>
      </div>

      <Link
        prefetch={false}
        href={kycVerified ? profileHref("tiers") : "/kyc"}
        className="mt-5 flex h-20 items-center gap-2.5 rounded-xl border-[1.5px] border-jumpa-primary-50 bg-jumpa-neutral-50 pr-3.5 pl-3.5 tap active:scale-[0.99]"
      >
        <ShieldUserIcon className="h-11 w-9.75 shrink-0" />
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="text-xs font-semibold tracking-[-0.04em] text-jumpa-primary-950">
            {kycVerified ? "KYC Complete" : "Complete your KYC"}
          </span>
          <span className="max-w-59 text-[11px] font-medium tracking-[-0.05em] text-jumpa-neutral-300">
            {kycVerified
              ? "Your identity is verified. See what your tier unlocks."
              : "Verify your identity to unlock all features and keep your account secure."}
          </span>
        </span>
        <CornerUpRightIcon className="size-6 shrink-0 text-jumpa-primary-950" />
      </Link>

      <div className="mt-4 flex flex-col gap-4">
        <SettingSection label="Your profile Information">
          <SettingCard className="pb-4">
            {country ? (
              <>
                <SettingRow icon={GlobeIcon} label="Country" value={country} />
                <SettingRule />
              </>
            ) : null}
            {user?.phoneNumber ? (
              <>
                <SettingRow
                  icon={PhoneIcon}
                  label="Phone Number"
                  value={user.phoneNumber}
                />
                <SettingRule />
              </>
            ) : null}
            {currentTag ? (
              <SettingRow
                icon={TagsIcon}
                label="Jumpa Tag"
                value={currentTag}
                action={<CopyButton value={currentTag} />}
              />
            ) : (
              <SettingAction
                icon={TagsIcon}
                label="Jumpa Tag"
                value="Tap to set"
                onClick={() => setEditingTag(true)}
              />
            )}
            <SettingRule />
            <SettingAction
              icon={TagsIcon}
              label="Nickname"
              value={currentNickname || "Tap to set"}
              onClick={() => setEditingNickname(true)}
            />
          </SettingCard>
        </SettingSection>

        <SettingSection label="Your wallet Information">
          <SettingCard>
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
                    className={`size-4.5 transition-transform duration-200 ${showOtherChains ? "rotate-180" : ""
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
                        {tronAddress && <SettingRule />}
                      </>
                    )}

                    {tronAddress && (
                      <SettingRow
                        icon={
                          <Image
                            src={getAssetLogo("TRX")}
                            alt="Tron"
                            width={24}
                            height={24}
                            className="size-6 shrink-0 rounded-full object-contain"
                          />
                        }
                        label="Tron Address (TRC-20)"
                        value={formatAddress(tronAddress)}
                        action={<CopyButton value={tronAddress} />}
                      />
                    )}
                  </div>
                )}
              </>
            )}
            <SettingRule />
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

      {editingNickname ? (
        <EditNicknameSheet
          value={currentNickname || ""}
          onSave={handleSaveNickname}
          onClose={() => setEditingNickname(false)}
        />
      ) : null}

      {editingTag ? (
        <SheetPortal onClose={() => setEditingTag(false)}>
          <div className="flex flex-col gap-4">
            <h2 className="text-center text-base leading-4.5 font-semibold text-jumpa-black">
              Set Jumpa Tag
            </h2>
            <JumpaTagForm
              onComplete={handleSaveTag}
              onClose={() => setEditingTag(false)}
            />
          </div>
        </SheetPortal>
      ) : null}
    </div>
  );
}
