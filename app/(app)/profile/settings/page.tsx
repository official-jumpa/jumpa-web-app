import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CurrencyRates } from "@/components/settings/currency-rates";
import { NotificationSettings } from "@/components/settings/notification-settings";
import { PinFlow } from "@/components/settings/pin-flow/pin-flow";
import {
  isSettingsSection,
  SETTINGS_SECTIONS,
} from "@/components/settings/sections";
import { SecuritySettings } from "@/components/settings/security-settings";
import { DevicesSettings } from "@/components/settings/devices-settings";
import { ExportSecret } from "@/components/settings/export-secret";
import { SettingsIndex } from "@/components/settings/settings-index";
import { StatementForm } from "@/components/settings/statement-form";
import { StatementIndex } from "@/components/settings/statement-index";
import { isPinFlow } from "@/lib/pin-flows";
import { isStatementKind, statementTitle } from "@/lib/statements";

interface SettingsPageProps {
  searchParams: Promise<{ section?: string; kind?: string }>;
}

export async function generateMetadata({
  searchParams,
}: SettingsPageProps): Promise<Metadata> {
  const { section, kind } = await searchParams;
  if (!section || !isSettingsSection(section)) return { title: "Settings" };
  if (section === "statements" && kind && isStatementKind(kind)) {
    return { title: statementTitle(kind) };
  }
  return { title: SETTINGS_SECTIONS[section].title };
}

/**
 * Settings and every screen under it. The sections used to be four levels of
 * nested route; they are one `?section=` on this route now.
 */
export default async function SettingsPage({
  searchParams,
}: SettingsPageProps) {
  const { section, kind } = await searchParams;
  if (!section) return <SettingsIndex />;
  if (!isSettingsSection(section)) notFound();

  if (section === "security") return <SecuritySettings />;
  if (section === "devices") return <DevicesSettings />;
  if (section === "notifications") return <NotificationSettings />;
  if (section === "rates") return <CurrencyRates />;
  if (section === "private-key" || section === "seed-phrase") {
    return <ExportSecret kind={section} />;
  }

  if (section === "statements") {
    if (!kind) return <StatementIndex />;
    if (!isStatementKind(kind)) notFound();
    return <StatementForm kind={kind} />;
  }

  if (isPinFlow(section)) return <PinFlow name={section} />;

  // Every section has a screen now; the registry is exhaustive.
  notFound();
}
