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
import { ShareDetailsButton } from "@/components/ngn/share-details-button";
import { NGN_ACCOUNT_FIELDS } from "@/lib/ngn-account";

const SHARE_TEXT = NGN_ACCOUNT_FIELDS.map(
  (field) => `${field.label}: ${field.value}`,
).join("\n");

/** The issued NGN account, and the one thing you do with it — pass it on. */
export function NgnAccountDetails() {
  return (
    <div className="flex min-h-dvh flex-col px-4.5 pt-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
      <ScreenHeader back="/home" title="NGN Account" round />

      <div className="mt-4">
        <SettingSection label="Account Details">
          <SettingCard className="pb-4">
            {NGN_ACCOUNT_FIELDS.map((field, index) => (
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
                {index < NGN_ACCOUNT_FIELDS.length - 1 ? (
                  <SettingRule />
                ) : null}
              </Fragment>
            ))}
          </SettingCard>
        </SettingSection>
      </div>

      <div className="mt-10">
        <ShareDetailsButton text={SHARE_TEXT} />
      </div>
    </div>
  );
}
