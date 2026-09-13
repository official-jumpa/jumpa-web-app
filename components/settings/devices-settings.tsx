"use client";

import { useCallback, useEffect, useState } from "react";
import { settingsHref } from "@/components/settings/sections";
import {
  SettingCard,
  SettingRule,
  SettingSection,
} from "@/components/settings/setting-section";
import { SettingsHeader } from "@/components/settings/settings-header";
import { LogOutIcon } from "@/components/ui/icons/log-out";
import { MobileIcon } from "@/components/ui/icons/mobile";
import { ShieldCheckIcon } from "@/components/ui/icons/shield-check";
import { formatNotificationTime } from "@/lib/notifications";

export interface SessionItem {
  id: string;
  isCurrent: boolean;
  ipAddress: string;
  userAgent: string;
  os: string;
  browser: string;
  deviceType: "desktop" | "mobile" | "tablet";
  deviceLabel: string;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
}

function LaptopIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <line x1="2" y1="20" x2="22" y2="20" />
    </svg>
  );
}

export function DevicesSettings() {
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [revokingOthers, setRevokingOthers] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/sessions");
      if (res.ok) {
        const data = await res.json();
        if (data.sessions) {
          setSessions(data.sessions);
        }
      }
    } catch (err) {
      console.warn("[DevicesSettings] Failed to fetch sessions:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const currentSession = sessions.find((s) => s.isCurrent) || sessions[0];
  const otherSessions = sessions.filter((s) => !s.isCurrent);

  const handleRevokeSingle = async (id: string) => {
    setRevokingId(id);
    setMessage(null);
    try {
      const res = await fetch(
        `/api/auth/sessions?id=${encodeURIComponent(id)}`,
        {
          method: "DELETE",
        },
      );
      if (res.ok) {
        setSessions((prev) => prev.filter((s) => s.id !== id));
        setMessage("Session revoked successfully");
        setTimeout(() => setMessage(null), 3500);
      }
    } catch (err) {
      console.error("[DevicesSettings] Error revoking session:", err);
    } finally {
      setRevokingId(null);
    }
  };

  const handleRevokeOthers = async () => {
    if (!confirm("Are you sure you want to log out of all other devices?")) {
      return;
    }
    setRevokingOthers(true);
    setMessage(null);
    try {
      const res = await fetch("/api/auth/sessions?target=others", {
        method: "DELETE",
      });
      if (res.ok) {
        setSessions((prev) => prev.filter((s) => s.isCurrent));
        setMessage("Logged out of all other sessions.");
        setTimeout(() => setMessage(null), 3500);
      }
    } catch (err) {
      console.error("[DevicesSettings] Error revoking other sessions:", err);
    } finally {
      setRevokingOthers(false);
    }
  };

  return (
    <div className="px-4.5 pt-[calc(env(safe-area-inset-top)+21px)] pb-12">
      <SettingsHeader back={settingsHref("security")} title="Your Devices" />

      {message && (
        <div className="mt-4 rounded-xl bg-jumpa-primary-50 px-4 py-3 text-xs font-medium text-jumpa-primary-700">
          {message}
        </div>
      )}

      {loading ? (
        <div className="mt-6 flex flex-col gap-5">
          <div className="h-32 animate-pulse rounded-surface bg-jumpa-neutral-50/60" />
          <div className="h-44 animate-pulse rounded-surface bg-jumpa-neutral-50/60" />
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-6">
          {/* Current Device Section */}
          <SettingSection label="Current Session">
            <SettingCard className="border-jumpa-primary-300/40 bg-gradient-to-b from-jumpa-neutral-50 to-jumpa-primary-50/20">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-b from-jumpa-primary-600 to-jumpa-primary-400 text-white">
                    {currentSession?.deviceType === "mobile" ? (
                      <MobileIcon className="size-5" />
                    ) : (
                      <LaptopIcon className="size-5" />
                    )}
                  </span>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-jumpa-black">
                        {currentSession?.os || "Current Device"}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-jumpa-primary-100 px-2 py-0.5 text-[10px] font-medium text-jumpa-primary-800">
                        <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        This device
                      </span>
                    </div>
                    <p className="text-xs text-jumpa-neutral-400">
                      {currentSession?.browser || "Browser"} • Active now
                    </p>
                  </div>
                </div>
              </div>
            </SettingCard>
          </SettingSection>

          {/* Other Devices Section */}
          <SettingSection label={`Other Devices (${otherSessions.length})`}>
            {otherSessions.length > 0 ? (
              <div className="flex flex-col gap-3">
                <SettingCard>
                  {otherSessions.map((session, index) => (
                    <div key={session.id} className="flex flex-col gap-3">
                      {index > 0 && <SettingRule />}
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-jumpa-neutral-100 text-jumpa-neutral-500">
                            {session.deviceType === "mobile" ? (
                              <MobileIcon className="size-4.5" />
                            ) : (
                              <LaptopIcon className="size-4.5" />
                            )}
                          </span>
                          <div className="flex flex-col gap-0.5">
                            <span className="text-xs font-semibold text-jumpa-black">
                              {session.os || "Device"} • {session.browser}
                            </span>
                            <span className="text-[10px] text-jumpa-neutral-400">
                              Logged in{" "}
                              {formatNotificationTime(session.createdAt)}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={revokingId === session.id}
                          onClick={() => handleRevokeSingle(session.id)}
                          className="tap rounded-pill border border-jumpa-danger/30 bg-jumpa-danger/10 px-3 py-1.5 text-[10px] font-medium text-jumpa-danger transition-transform active:scale-95 disabled:opacity-50"
                        >
                          {revokingId === session.id ? "Revoking..." : "Revoke"}
                        </button>
                      </div>
                    </div>
                  ))}
                </SettingCard>

                {/* Log Out of All Other Sessions Button */}
                <button
                  type="button"
                  disabled={revokingOthers}
                  onClick={handleRevokeOthers}
                  className="tap mt-2 flex w-full items-center justify-center gap-2 rounded-surface bg-jumpa-danger/15 px-4 py-3.5 text-xs font-semibold text-jumpa-danger active:scale-98 disabled:opacity-50 transition-colors hover:bg-jumpa-danger/20"
                >
                  <LogOutIcon className="size-4" />
                  {revokingOthers
                    ? "Logging out other devices..."
                    : "Log out of all other sessions"}
                </button>
              </div>
            ) : (
              <SettingCard className="items-center py-8 text-center">
                <span className="flex size-12 items-center justify-center rounded-full bg-jumpa-primary-50 text-jumpa-primary-600">
                  <ShieldCheckIcon className="size-6" />
                </span>
                <p className="mt-2 text-xs font-semibold text-jumpa-black">
                  No other active sessions
                </p>
                <p className="max-w-[240px] text-[11px] text-jumpa-neutral-300">
                  You are only signed in on this device. If you sign in
                  elsewhere, it will appear here.
                </p>
              </SettingCard>
            )}
          </SettingSection>
        </div>
      )}
    </div>
  );
}
