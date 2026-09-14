import { SupportOptionList } from "@/components/support/support-options";
import { SettingsHeader } from "@/components/settings/settings-header";

/**
 * The chooser as a screen, for a direct load and for the Settings row. The
 * design raises it as a sheet over home; both render the same list.
 */
export function SupportIndex() {
  return (
    <div className="px-4.5 pt-[calc(env(safe-area-inset-top)+21px)] pb-12">
      <SettingsHeader back="/profile/settings" title="Help & Support" />

      <div className="mt-6">
        <SupportOptionList />
      </div>
    </div>
  );
}
