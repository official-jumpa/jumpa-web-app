import type { Metadata } from "next";
import { SettingLink, SettingRow } from "@/components/settings/setting-row";
import {
  SettingCard,
  SettingRule,
  SettingSection,
} from "@/components/settings/setting-section";
import { SettingsHeader } from "@/components/settings/settings-header";
import { Toggle } from "@/components/settings/toggle";
import { FaceIdIcon } from "@/components/ui/icons/face-id";
import { KeyIcon } from "@/components/ui/icons/key";
import { KeyboardAltIcon } from "@/components/ui/icons/keyboard-alt";
import { MobileIcon } from "@/components/ui/icons/mobile";
import { SealAlertIcon } from "@/components/ui/icons/seal-alert";

export const metadata: Metadata = { title: "Security" };

export default function SecurityPage() {
  return (
    <div className="px-4.5 pt-[calc(env(safe-area-inset-top)+21px)] pb-12">
      <SettingsHeader back="/profile/settings" title="Security" />

      <div className="mt-4.25 flex flex-col gap-4">
        <SettingSection label="Biometrics/Authentications">
          <SettingCard>
            <SettingRow
              icon={FaceIdIcon}
              label="Face ID/ Fingerprints for Login"
              action={<Toggle label="Face ID or fingerprint for login" />}
            />
            <SettingRule />
            <SettingRow
              icon={FaceIdIcon}
              label="Face ID for Transactions"
              action={<Toggle label="Face ID for transactions" />}
            />
            <SettingRule />
            <SettingRow
              icon={KeyboardAltIcon}
              label="PIN for Transactions"
              action={<Toggle label="PIN for transactions" />}
            />
          </SettingCard>
        </SettingSection>

        <SettingSection label="Devices">
          <SettingCard>
            <SettingLink
              href="/profile/settings/security/devices"
              icon={MobileIcon}
              label="See where you're logged in"
            />
          </SettingCard>
        </SettingSection>

        {/* Two separate cards here, not one card with a rule — that is the design. */}
        <SettingSection label="Wallet Security">
          <SettingCard>
            <SettingLink
              href="/profile/settings/security/private-key"
              icon={KeyIcon}
              label="Export Private Key"
            />
          </SettingCard>
          <SettingCard>
            <SettingLink
              href="/profile/settings/security/seed-phrase"
              icon={KeyIcon}
              label="Export Seed Phrase"
            />
          </SettingCard>
        </SettingSection>

        <p className="mt-2 flex gap-2 text-jumpa-warning">
          <SealAlertIcon className="mt-2.75 size-6 shrink-0" />
          <span className="flex flex-col gap-1">
            <span className="text-sm leading-3.5 font-semibold">
              NO Security Enabled
            </span>
            <span className="text-xs leading-3.5">
              A PIN is used to sign transactions on your device. It's never sent
              to Jumpa servers.
            </span>
          </span>
        </p>
      </div>
    </div>
  );
}
