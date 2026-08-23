import type { Metadata } from "next";
import { SettingRow } from "@/components/settings/setting-row";
import {
  SettingCard,
  SettingRule,
  SettingSection,
} from "@/components/settings/setting-section";
import { SettingsHeader } from "@/components/settings/settings-header";
import { Toggle } from "@/components/settings/toggle";
import { BellAltIcon } from "@/components/ui/icons/bell-alt";

export const metadata: Metadata = { title: "Notifications" };

export default function NotificationSettingsPage() {
  return (
    <div className="px-4.5 pt-[calc(env(safe-area-inset-top)+21px)] pb-12">
      <SettingsHeader back="/profile/settings" title="Notifications" />

      <div className="mt-4.25 flex flex-col gap-7.25">
        <SettingSection label="General Notifications">
          <SettingCard>
            <SettingRow
              icon={BellAltIcon}
              label="Push Notifications"
              action={<Toggle label="Push notifications" />}
            />
          </SettingCard>
        </SettingSection>

        <SettingSection label="Security Notifications">
          <SettingCard>
            <SettingRow
              icon={BellAltIcon}
              label="New Login Detected"
              action={<Toggle label="New login detected" />}
            />
          </SettingCard>
        </SettingSection>

        {/* The design repeats "Security Notifications" for this group; kept verbatim. */}
        <SettingSection label="Security Notifications">
          <SettingCard>
            <SettingRow
              icon={BellAltIcon}
              label="Haptics"
              action={<Toggle label="Haptics" />}
            />
            <SettingRule />
            <SettingRow
              icon={BellAltIcon}
              label="In App Sounds"
              action={<Toggle label="In app sounds" />}
            />
          </SettingCard>
        </SettingSection>
      </div>
    </div>
  );
}
