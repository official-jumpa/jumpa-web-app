"use client";

import { useCallback, useEffect, useState } from "react";
import { CopyButton } from "@/components/auth/copy-button";
import { PromotionList } from "@/components/home/promotion-list";
import { EarningsCard } from "@/components/referrals/earnings-card";
import { HowItWorks } from "@/components/referrals/how-it-works";
import { ReferralHistory } from "@/components/referrals/referral-history";
import { WelcomeRewardCard } from "@/components/referrals/welcome-reward-card";
import { SettingAction, SettingRow } from "@/components/settings/setting-row";
import {
  SettingCard,
  SettingRule,
  SettingSection,
} from "@/components/settings/setting-section";
import { SettingsHeader } from "@/components/settings/settings-header";
import { Button } from "@/components/ui/button";
import { PartyBellIcon } from "@/components/ui/icons/party-bell";
import { UsersIcon } from "@/components/ui/icons/users";
import { toast } from "@/components/ui/toast";
import { copyText } from "@/lib/clipboard";
import type { ReferralOverview } from "@/lib/referrals/overview";
import { formatRewardNaira, REFERRAL_REWARD_NGN } from "@/lib/referrals/rules";
import { PROMOTIONS } from "@/lib/wallet";

async function fetchOverview(): Promise<ReferralOverview | null> {
  const res = await fetch("/api/v1/referrals", { cache: "no-store" });
  if (!res.ok) return null;
  const body = await res.json();
  return (body?.data as ReferralOverview) ?? null;
}

export function ReferralsView({
  initialData,
}: {
  initialData: ReferralOverview | null;
}) {
  const [data, setData] = useState<ReferralOverview | null>(initialData);
  const [claiming, setClaiming] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const next = await fetchOverview();
      if (next) setData(next);
    } catch (err) {
      console.error("[ReferralsView] Failed to fetch referrals:", err);
    }
  }, []);

  // The server render can miss (e.g. a cold DB); fetch once on the client instead.
  useEffect(() => {
    if (!initialData) void refresh();
  }, [initialData, refresh]);

  const code = data?.code ?? "";
  const link = data?.link ?? "";
  const available = data?.earnings.available ?? 0;

  const share = async () => {
    const text = `Join me on Jumpa and get ${formatRewardNaira(REFERRAL_REWARD_NGN.referred)} after your first $10 trade. Use my code ${code}.`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Join me on Jumpa", text, url: link });
        return;
      } catch {
        // Dismissed, or no target — fall through to the clipboard.
      }
    }
    if (await copyText(`${text} ${link}`))
      toast.success("Invite copied", "Paste it anywhere to share.");
    else toast.error("Could not copy your invite");
  };

  const claim = async () => {
    setClaiming(true);
    try {
      const res = await fetch("/api/v1/referrals/claim", { method: "POST" });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.success) {
        toast.error("Could not claim your earnings", body?.error);
        return;
      }
      toast.success(
        "Earnings claimed",
        `${formatRewardNaira(body.data.amount)} was added to your Naira wallet.`,
      );
      await refresh();
    } catch {
      toast.error(
        "Could not claim your earnings",
        "Check your connection and try again.",
      );
    } finally {
      setClaiming(false);
    }
  };

  const welcome =
    data?.invitedBy &&
    (data.invitedBy.status === "joined" ||
      data.invitedBy.status === "kyc_verified")
      ? data.invitedBy
      : null;

  return (
    <div className="flex flex-col px-4.5 pt-[calc(env(safe-area-inset-top)+21px)] pb-12">
      <SettingsHeader back="/profile/settings" title="Referrals" />

      <section className="mt-6 flex flex-col gap-2">
        <EarningsCard
          available={available}
          total={data?.earnings.total ?? 0}
          invited={data?.counts.invited ?? 0}
        />

        {available > 0 && data && !data.hasNairaAccount ? (
          <Button href="/ngn-account" variant="brand" size="compact">
            Create your Naira account to claim
          </Button>
        ) : (
          <Button
            variant="brand"
            size="compact"
            className="disabled:opacity-60"
            disabled={available <= 0 || claiming}
            onClick={claim}
          >
            {claiming
              ? "Claiming…"
              : available > 0
                ? `Claim ${formatRewardNaira(available)}`
                : "Claim Earnings"}
          </Button>
        )}
      </section>

      <div className="mt-4.25 flex flex-col gap-4.75">
        {welcome ? (
          <WelcomeRewardCard
            verified={welcome.status === "kyc_verified"}
            reward={welcome.reward}
          />
        ) : null}

        <SettingSection label="Referral Methods">
          <SettingCard>
            <SettingRow
              icon={UsersIcon}
              label="Your Referral Code"
              value={code}
              action={<CopyButton value={code} />}
            />
            <SettingRule />
            <SettingRow
              icon={UsersIcon}
              label="Your Referral Link"
              value={link}
              action={<CopyButton value={link} />}
            />
            <SettingRule />
            <SettingAction
              icon={PartyBellIcon}
              label="Invite friends to Jumpa and earn rewards"
              onClick={share}
              brand
            />
          </SettingCard>
        </SettingSection>

        <HowItWorks
          status={data?.campaign.status ?? "off"}
          endsAt={data?.campaign.endsAt ?? null}
        />

        <PromotionList promotions={PROMOTIONS} />

        <ReferralHistory
          items={data?.history ?? []}
          invited={data?.counts.invited ?? 0}
        />
      </div>
    </div>
  );
}
