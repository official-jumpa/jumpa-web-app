import { Fragment } from "react";
import { CopyButton } from "@/components/auth/copy-button";
import { SettingRow } from "@/components/settings/setting-row";
import {
  SettingCard,
  SettingRule,
  SettingSection,
} from "@/components/settings/setting-section";
import { TagsIcon } from "@/components/ui/icons/tags";
import { ScreenHeader } from "@/components/ui/screen-header";
import { ShareDetailsButton } from "@/components/usd/share-details-button";
import { USD_ACCOUNT_FIELDS } from "@/lib/usd-account";

const SHARE_TEXT = USD_ACCOUNT_FIELDS.map(
  (field) => `${field.label}: ${field.value}`,
).join("\n");

/** The issued account, and the one thing you do with it — pass it on. */
export function UsdAccountDetails() {
  return (
    <div className="flex min-h-dvh flex-col px-4.5 pt-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
      <ScreenHeader back="/home" title="USD Account" round />

      <div className="mt-4">
        <SettingSection label="Account Details">
          <SettingCard className="pb-4">
            {USD_ACCOUNT_FIELDS.map((field, index) => (
              <Fragment key={field.label}>
                <SettingRow
                  icon={TagsIcon}
                  label={field.label}
                  value={field.value}
                  action={
                    <CopyButton
                      value={field.value}
                      name={`Copy ${field.label.toLowerCase()}`}
                    />
                  }
                />
                {index < USD_ACCOUNT_FIELDS.length - 1 ? <SettingRule /> : null}
              </Fragment>
            ))}
          </SettingCard>
        </SettingSection>
      </div>

      {/* In flow, not bottom-anchored — the design sits it under the card. */}
      <div className="mt-10">
        <ShareDetailsButton text={SHARE_TEXT} />
      </div>
    </div>
  );
}
