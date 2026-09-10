/**
 * Settings is one route. Every screen under it is a `?section=` on
 * `/profile/settings`, so the tree is two levels deep instead of four and a
 * section's back button always has the same place to return to.
 */
export const SETTINGS_SECTIONS = {
  security: { title: "Security" },
  notifications: { title: "Notifications" },
  statements: { title: "Statement and report" },
  rates: { title: "Currency Rates" },
  support: { title: "Help & Support", stub: true },
  // Reached from Security, so that is where their back goes.
  "login-pin": { title: "Change Login PIN", parent: "security" },
  "transaction-pin": { title: "Change Transaction PIN", parent: "security" },
  "forgot-login-pin": { title: "Forgot Login PIN", parent: "security" },
  "forgot-transaction-pin": {
    title: "Forgot Transaction PIN",
    parent: "security",
  },
  devices: { title: "Your Devices", stub: true, parent: "security" },
  "private-key": {
    title: "Export Private Key",
    stub: true,
    parent: "security",
  },
  "seed-phrase": {
    title: "Export Seed Phrase",
    stub: true,
    parent: "security",
  },
} as const satisfies Record<
  string,
  { title: string; stub?: true; parent?: string }
>;

export type SettingsSection = keyof typeof SETTINGS_SECTIONS;

export function isSettingsSection(value: string): value is SettingsSection {
  return value in SETTINGS_SECTIONS;
}

export function settingsHref(section?: SettingsSection): string {
  return section ? `/profile/settings?section=${section}` : "/profile/settings";
}
