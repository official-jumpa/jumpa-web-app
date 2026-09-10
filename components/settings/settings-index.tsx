"use client";

import { useState } from "react";
import { AccountActions } from "@/components/settings/account-actions";
import { settingsHref } from "@/components/settings/sections";
import { SettingAction, SettingLink } from "@/components/settings/setting-row";
import {
  SettingCard,
  SettingRule,
  SettingSection,
} from "@/components/settings/setting-section";
import { SettingsHeader } from "@/components/settings/settings-header";
import { StatementRequestSheet } from "@/components/settings/statement-request";
import { BadgeDollarIcon } from "@/components/ui/icons/badge-dollar";
import { BellAltIcon } from "@/components/ui/icons/bell-alt";
import { CircleUserIcon } from "@/components/ui/icons/circle-user";
import { ClipboardTextIcon } from "@/components/ui/icons/clipboard-text";
import { HeartAltIcon } from "@/components/ui/icons/heart-alt";
import { IdCardIcon } from "@/components/ui/icons/id-card";
import { ShieldCheckIcon } from "@/components/ui/icons/shield-check";
import { UsersIcon } from "@/components/ui/icons/users";

/** The settings landing. Every row below opens a section of this same route. */
export function SettingsIndex() {
  const [statementsOpen, setStatementsOpen] = useState(false);

  return (
    <>
      <div className="px-4.5 pt-[calc(env(safe-area-inset-top)+21px)] pb-12">
        <SettingsHeader back="/profile" title="Settings" />

        <div className="mt-4.25 flex flex-col gap-8.5">
          <SettingSection label="Profile Information">
            <SettingCard>
              <SettingLink
                href="/profile"
                icon={CircleUserIcon}
                label="My Profile"
              />
              <SettingRule />
              <SettingLink
                href={settingsHref("security")}
                icon={ShieldCheckIcon}
                label="Security"
              />
              <SettingRule />
              <SettingLink
                href="/kyc"
                icon={IdCardIcon}
                label="KYC Verification"
              />
            </SettingCard>
          </SettingSection>

          <SettingSection label="Preference's">
            <SettingCard>
              <SettingLink
                href={settingsHref("notifications")}
                icon={BellAltIcon}
                label="Notifications"
              />
              <SettingRule />
              <SettingLink
                href={settingsHref("rates")}
                icon={BadgeDollarIcon}
                label="Currency Rates"
              />
              <SettingRule />
              <SettingLink
                href="/referrals"
                icon={UsersIcon}
                label="Your Referrals"
              />
            </SettingCard>
          </SettingSection>

          <SettingSection label="Profile Information">
            <SettingCard>
              <SettingAction
                icon={ClipboardTextIcon}
                label="Request Account Statements"
                onClick={() => setStatementsOpen(true)}
              />
              <SettingRule />
              <SettingLink
                href={settingsHref("support")}
                icon={HeartAltIcon}
                label="Help & Support"
              />
            </SettingCard>
          </SettingSection>

          <AccountActions />
        </div>
      </div>

      {statementsOpen ? (
        <StatementRequestSheet onClose={() => setStatementsOpen(false)} />
      ) : null}
    </>
  );
}
