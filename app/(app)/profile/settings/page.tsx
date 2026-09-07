import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NotificationSettings } from "@/components/settings/notification-settings";
import {
  isSettingsSection,
  SETTINGS_SECTIONS,
  settingsHref,
} from "@/components/settings/sections";
import { SecuritySettings } from "@/components/settings/security-settings";
import { SettingsIndex } from "@/components/settings/settings-index";
import { ComingSoon } from "@/components/ui/coming-soon";

interface SettingsPageProps {
  searchParams: Promise<{ section?: string }>;
}

export async function generateMetadata({
  searchParams,
}: SettingsPageProps): Promise<Metadata> {
  const { section } = await searchParams;
  if (!section || !isSettingsSection(section)) return { title: "Settings" };
  return { title: SETTINGS_SECTIONS[section].title };
}

/**
 * Settings and every screen under it. The sections used to be four levels of
 * nested route; they are one `?section=` on this route now.
 */
export default async function SettingsPage({
  searchParams,
}: SettingsPageProps) {
  const { section } = await searchParams;
  if (!section) return <SettingsIndex />;
  if (!isSettingsSection(section)) notFound();

  if (section === "security") return <SecuritySettings />;
  if (section === "notifications") return <NotificationSettings />;

  const entry = SETTINGS_SECTIONS[section];
  const parent = "parent" in entry ? entry.parent : undefined;
  return (
    <ComingSoon
      feature={entry.title}
      back={parent === "security" ? settingsHref("security") : settingsHref()}
    />
  );
}
