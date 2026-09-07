/**
 * Settings is one route. Every screen under it is a `?section=` on
 * `/profile/settings`, so the tree is two levels deep instead of four and a
 * section's back button always has the same place to return to.
 */
export const SETTINGS_SECTIONS = {
  security: { title: "Security" },
  notifications: { title: "Notifications" },
  currency: { title: "Currency Display", stub: true },
  rates: { title: "Currency Rates", stub: true },
  statements: { title: "Account Statements", stub: true },
  support: { title: "Help & Support", stub: true },
  // Reached from Security, so that is where their back goes.
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
