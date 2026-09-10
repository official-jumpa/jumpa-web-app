import { settingsHref } from "@/components/settings/sections";
import { SettingSection } from "@/components/settings/setting-section";
import { SettingsHeader } from "@/components/settings/settings-header";
import { StatementOptions } from "@/components/settings/statement-options";

/**
 * `?section=statements`. The design raises this list as a sheet over Settings;
 * this is the same list for a direct load or a back-nav into the section.
 */
export function StatementIndex() {
  return (
    <div className="px-4.5 pt-[calc(env(safe-area-inset-top)+21px)] pb-12">
      <SettingsHeader back={settingsHref()} title="Statement and report" />

      <div className="mt-4.25">
        <SettingSection label="Statement Section">
          <StatementOptions />
        </SettingSection>
      </div>
    </div>
  );
}
