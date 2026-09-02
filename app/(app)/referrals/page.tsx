"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
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
import { PROMOTIONS } from "@/lib/wallet";

interface ReferralHistoryItem {
  id: string;
  name: string;
  joinedAt: string;
  points: number;
}

interface ReferralData {
  points: number;
  invited: number;
  target: number;
  referralCode: string;
  referralLink: string;
  history: ReferralHistoryItem[];
}

export default function ReferralsPage() {
  const [data, setData] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchReferrals() {
      try {
        const res = await fetch("/api/referrals");
        if (res.ok) {
          const resData = await res.json();
          setData(resData);
        }
      } catch (err) {
        console.error("[ReferralsPage] Failed to fetch referrals:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchReferrals();
  }, []);

  const points = data?.points ?? 0;
  const invited = data?.invited ?? 0;
  const target = data?.target ?? 40;
  const referralCode = data?.referralCode ?? "";
  const referralLink = data?.referralLink ?? "";
  const history = data?.history ?? [];

  return (
    <div className="flex flex-col px-4.5 pt-[calc(env(safe-area-inset-top)+21px)] pb-12">
      <SettingsHeader back="/profile" title="Referrals" />

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
            Referral Points
          </span>
          <p className="mt-2 leading-0 font-bold text-jumpa-white">
            <span className="text-[26px] leading-6.5">{points}</span>
            <span className="ml-1 text-sm font-medium text-jumpa-white/80">
              {points === 1 ? "point" : "points"}
            </span>
          </p>

          <span className="absolute top-3 right-2.5 flex h-8.5 items-center rounded-pill bg-jumpa-white/25 px-2.75 text-xs leading-3 font-medium text-jumpa-white">
            {invited}/{target} Invited
          </span>
        </div>

        <Button
          variant="brand"
          size="sm"
          className="text-sm opacity-60 cursor-not-allowed"
          disabled
        >
          Claim Earnings (Coming Soon)
        </Button>
      </section>

      <div className="mt-4.25 flex flex-col">
        <SettingSection label="Referral Methods">
          <SettingCard>
            <SettingRow
              icon={UsersIcon}
              label="Your Referral Code"
              value={referralCode}
              action={<CopyButton value={referralCode} />}
            />
            <SettingRule />
            <SettingRow
              icon={UsersIcon}
              label="Your Referral Link"
              value={referralLink}
              action={<CopyButton value={referralLink} />}
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

        <section className="mt-4.75 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm leading-4 font-medium text-jumpa-black">
              Referral History
            </h2>
            <span className="text-xs leading-3.5 text-jumpa-neutral-350">
              {invited} Invited
            </span>
          </div>

          {history.length === 0 ? (
            <div className="flex h-25 flex-col items-center justify-center rounded-card bg-jumpa-neutral-50 px-4 text-center">
              <p className="text-xs font-medium text-jumpa-neutral-350">
                No referrals yet. Share your referral link with friends to earn
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {history.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-surface border border-jumpa-neutral-60 bg-jumpa-neutral-50 px-3.5 py-3"
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-semibold text-jumpa-black">
                      {item.name}
                    </span>
                    <span className="text-[10px] text-jumpa-neutral-350">
                      Joined{" "}
                      {new Date(item.joinedAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                  <span className="rounded-pill bg-jumpa-primary-100 px-2 py-0.5 text-xs font-bold text-jumpa-primary-600">
                    +{item.points} pt
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
