"use client";

import { useCallback, useEffect, useState } from "react";
import { settingsHref } from "@/components/settings/sections";
import { SettingRow } from "@/components/settings/setting-row";
import {
  SettingCard,
  SettingRule,
  SettingSection,
} from "@/components/settings/setting-section";
import { SettingsHeader } from "@/components/settings/settings-header";
import { Toggle } from "@/components/settings/toggle";
import { BellAltIcon } from "@/components/ui/icons/bell-alt";
import type { IUserPreference } from "@/models/UserPreference";

interface NotificationSettingsProps {
  initialPreferences?: IUserPreference;
}

const DEFAULTS = {
  pushNotifications: true,
  emailNotifications: true,
  newLoginDetected: true,
  haptics: true,
  inAppSounds: true,
};

/** `?section=notifications`. */
export function NotificationSettings({
  initialPreferences,
}: NotificationSettingsProps = {}) {
  const [prefs, setPrefs] = useState({
    pushNotifications: initialPreferences?.pushNotifications ?? DEFAULTS.pushNotifications,
    emailNotifications: initialPreferences?.emailNotifications ?? DEFAULTS.emailNotifications,
    newLoginDetected: initialPreferences?.newLoginDetected ?? DEFAULTS.newLoginDetected,
    haptics: initialPreferences?.haptics ?? DEFAULTS.haptics,
    inAppSounds: initialPreferences?.inAppSounds ?? DEFAULTS.inAppSounds,
  });

  // Client-side fallback if initialPreferences was not provided
  const loadPreferences = useCallback(async () => {
    try {
      const res = await fetch("/api/user/preference");
      if (!res.ok) return;
      const data = await res.json();
      if (data?.preferences) {
        setPrefs({
          pushNotifications: data.preferences.pushNotifications ?? DEFAULTS.pushNotifications,
          emailNotifications: data.preferences.emailNotifications ?? DEFAULTS.emailNotifications,
          newLoginDetected: data.preferences.newLoginDetected ?? DEFAULTS.newLoginDetected,
          haptics: data.preferences.haptics ?? DEFAULTS.haptics,
          inAppSounds: data.preferences.inAppSounds ?? DEFAULTS.inAppSounds,
        });
      }
    } catch (err) {
      console.warn("[NotificationSettings] preferences:", err);
    }
  }, []);

  useEffect(() => {
    if (initialPreferences !== undefined) return;
    loadPreferences();
  }, [initialPreferences, loadPreferences]);

  const handleToggle = async (
    key: "pushNotifications" | "newLoginDetected" | "haptics" | "inAppSounds",
    value: boolean,
  ) => {
    const previous = prefs[key];
    // 1. Optimistic update
    setPrefs((prev) => ({ ...prev, [key]: value }));

    // 2. Persist to DB
    try {
      const res = await fetch("/api/user/preference", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: value }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (err) {
      console.error(`[NotificationSettings] Failed to update ${key}:`, err);
      // Revert on failure
      setPrefs((prev) => ({ ...prev, [key]: previous }));
    }
  };

  return (
    <div className="px-4.5 pt-[calc(env(safe-area-inset-top)+21px)] pb-12">
      <SettingsHeader back={settingsHref()} title="Notifications" />

      <div className="mt-4.25 flex flex-col gap-7.25">
        <SettingSection label="General Notifications">
          <SettingCard>
            <SettingRow
              icon={BellAltIcon}
              label="Push Notifications"
              action={
                <Toggle
                  label="Push notifications"
                  checked={prefs.pushNotifications}
                  onChange={(val) => handleToggle("pushNotifications", val)}
                />
              }
            />
          </SettingCard>
        </SettingSection>

        <SettingSection label="Security Notifications">
          <SettingCard>
            <SettingRow
              icon={BellAltIcon}
              label="New Login Detected"
              action={
                <Toggle
                  label="New login detected"
                  checked={prefs.newLoginDetected}
                  onChange={(val) => handleToggle("newLoginDetected", val)}
                />
              }
            />
          </SettingCard>
        </SettingSection>

        {/* App Preferences & Feedback */}
        <SettingSection label="Security Notifications">
          <SettingCard>
            <SettingRow
              icon={BellAltIcon}
              label="Haptics"
              action={
                <Toggle
                  label="Haptics"
                  checked={prefs.haptics}
                  onChange={(val) => handleToggle("haptics", val)}
                />
              }
            />
            <SettingRule />
            <SettingRow
              icon={BellAltIcon}
              label="In App Sounds"
              action={
                <Toggle
                  label="In app sounds"
                  checked={prefs.inAppSounds}
                  onChange={(val) => handleToggle("inAppSounds", val)}
                />
              }
            />
          </SettingCard>
        </SettingSection>
      </div>
    </div>
  );
}
