"use client";

import { useState } from "react";
import { BottomNav } from "@/components/home/bottom-nav";
import { IdDocumentSheet } from "@/components/settings/id-document-sheet";
import { SettingLink } from "@/components/settings/setting-row";
import {
  SettingCard,
  SettingRule,
  SettingSection,
} from "@/components/settings/setting-section";
import { SettingsHeader } from "@/components/settings/settings-header";
import { BadgeDollarIcon } from "@/components/ui/icons/badge-dollar";
import { BellAltIcon } from "@/components/ui/icons/bell-alt";
import { ChevronRightIcon } from "@/components/ui/icons/chevron-right";
import { CircleUserIcon } from "@/components/ui/icons/circle-user";
import { ClipboardTextIcon } from "@/components/ui/icons/clipboard-text";
import { HeartAltIcon } from "@/components/ui/icons/heart-alt";
import { IdCardIcon } from "@/components/ui/icons/id-card";
import { MoneyInsertIcon } from "@/components/ui/icons/money-insert";
import { ShieldCheckIcon } from "@/components/ui/icons/shield-check";
import { UsersIcon } from "@/components/ui/icons/users";

export default function SettingsPage() {
  const [kycOpen, setKycOpen] = useState(false);

  return (
    <>
      <div className="px-4.5 pt-[calc(env(safe-area-inset-top)+21px)] pb-27">
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
                href="/profile/settings/security"
                icon={ShieldCheckIcon}
                label="Security"
              />
              <SettingRule />
              <button
                type="button"
                onClick={() => setKycOpen(true)}
                className="flex items-center justify-between gap-3 tap active:scale-[0.99]"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <IdCardIcon className="size-6 shrink-0 text-jumpa-primary-600" />
                  <span className="truncate text-xs leading-3 font-medium text-jumpa-black">
                    KYC Verification
                  </span>
                </span>
                <ChevronRightIcon className="size-5 shrink-0 text-jumpa-black" />
              </button>
            </SettingCard>
          </SettingSection>

          <SettingSection label="Preference's">
            <SettingCard>
              <SettingLink
                href="/profile/settings/notifications"
                icon={BellAltIcon}
                label="Notifications"
              />
              <SettingRule />
              <SettingLink
                href="/profile/settings/currency"
                icon={BadgeDollarIcon}
                label="Currency Display"
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
              <SettingLink
                href="/profile/settings/rates"
                icon={MoneyInsertIcon}
                label="Currency Rates"
              />
              <SettingRule />
              <SettingLink
                href="/profile/settings/statements"
                icon={ClipboardTextIcon}
                label="Request Account Statements"
              />
              <SettingRule />
              <SettingLink
                href="/profile/settings/support"
                icon={HeartAltIcon}
                label="Help & Support"
              />
            </SettingCard>
          </SettingSection>
        </div>
      </div>

      {kycOpen ? <IdDocumentSheet onClose={() => setKycOpen(false)} /> : null}
      <BottomNav />
    </>
  );
}
