import { settingsHref } from "@/components/settings/sections";
import { SettingLink, SettingRow } from "@/components/settings/setting-row";
import {
  SettingCard,
  SettingRule,
  SettingSection,
} from "@/components/settings/setting-section";
import { SettingsHeader } from "@/components/settings/settings-header";
import { Toggle } from "@/components/settings/toggle";
import { DialpadCircleIcon } from "@/components/ui/icons/dialpad-circle";
import { FaceIdIcon } from "@/components/ui/icons/face-id";
import { KeyIcon } from "@/components/ui/icons/key";
import { MobileIcon } from "@/components/ui/icons/mobile";
import { SealAlertIcon } from "@/components/ui/icons/seal-alert";

/** `?section=security`. */
export function SecuritySettings() {
  return (
    <div className="px-4.5 pt-[calc(env(safe-area-inset-top)+21px)] pb-12">
      <SettingsHeader back={settingsHref()} title="Security" />

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
          </SettingCard>
        </SettingSection>

        {/* Both PIN cards sit under the biometrics label — the design gives
            neither a heading of its own. */}
        <SettingCard>
          <SettingLink
            href={settingsHref("transaction-pin")}
            icon={DialpadCircleIcon}
            label="Change Transaction PIN"
          />
          <SettingRule />
          <SettingLink
            href={settingsHref("forgot-transaction-pin")}
            icon={DialpadCircleIcon}
            label="Forgot Transaction PIN?"
          />
        </SettingCard>

        <SettingCard>
          <SettingLink
            href={settingsHref("login-pin")}
            icon={DialpadCircleIcon}
            label="Change Login PIN"
          />
          <SettingRule />
          <SettingLink
            href={settingsHref("forgot-login-pin")}
            icon={DialpadCircleIcon}
            label="Forgot Login PIN?"
          />
        </SettingCard>

        <SettingSection label="Devices">
          <SettingCard>
            <SettingLink
              href={settingsHref("devices")}
              icon={MobileIcon}
              label="See where you're logged in"
            />
          </SettingCard>
        </SettingSection>

        {/* Two separate cards here, not one card with a rule — that is the design. */}
        <SettingSection label="Wallet Security">
          <SettingCard>
            <SettingLink
              href={settingsHref("private-key")}
              icon={KeyIcon}
              label="Export Private Key"
            />
          </SettingCard>
          <SettingCard>
            <SettingLink
              href={settingsHref("seed-phrase")}
              icon={KeyIcon}
              label="Export Seed Phrase"
            />
          </SettingCard>
        </SettingSection>
      </div>
    </div>
  );
}
