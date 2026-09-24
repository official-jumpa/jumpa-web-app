"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { AccountSheet } from "@/components/settings/account-sheet";
import { settingsHref } from "@/components/settings/sections";
import {
  SettingCard,
  SettingRule,
  SettingSection,
} from "@/components/settings/setting-section";
import { SettingsHeader } from "@/components/settings/settings-header";
import { Button } from "@/components/ui/button";
import { LaptopIcon } from "@/components/ui/icons/laptop";
import { LogOutIcon } from "@/components/ui/icons/log-out";
import { MobileIcon } from "@/components/ui/icons/mobile";
import { ShieldCheckIcon } from "@/components/ui/icons/shield-check";
import {
  deviceName,
  deviceTrace,
  formatSignIn,
  type SessionItem,
} from "@/lib/sessions";

const NOTICE_MS = 3500;

const META = "text-[10px] leading-3.5 text-jumpa-neutral-400";

/** A phone gets the handset; everything else gets the laptop. */
const glyphFor = (type: SessionItem["deviceType"]) =>
  type === "desktop" ? LaptopIcon : MobileIcon;

/** Which confirmation is up: one device by id, or every other device. */
type Confirming = { id: string; name: string } | "others";

export function DevicesSettings() {
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState<Confirming>();
  const [revoking, setRevoking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadSessions = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/sessions");
      if (res.ok) {
        const data = await res.json();
        if (data.sessions) setSessions(data.sessions);
      }
    } catch (err) {
      console.warn("[DevicesSettings] Failed to fetch sessions:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), NOTICE_MS);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const current = sessions.find((s) => s.isCurrent) ?? sessions[0];
  const others = sessions.filter((s) => !s.isCurrent);

  const revoke = async () => {
    if (!confirming) return;
    const others_ = confirming === "others";

    setRevoking(true);
    setError(null);
    try {
      const query = others_
        ? "target=others"
        : `id=${encodeURIComponent(confirming.id)}`;
      const res = await fetch(`/api/auth/sessions?${query}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        setError("That didn't go through. Try again in a moment.");
        return;
      }

      setSessions((prev) =>
        others_
          ? prev.filter((s) => s.isCurrent)
          : prev.filter((s) => s.id !== confirming.id),
      );
      setNotice(
        others_
          ? "Logged out of every other device."
          : `${confirming.name} is signed out.`,
      );
      setConfirming(undefined);
    } catch (err) {
      console.error("[DevicesSettings] Error revoking session:", err);
      setError("Check your connection and try again.");
    } finally {
      setRevoking(false);
    }
  };

  const closeSheet = () => {
    setConfirming(undefined);
    setError(null);
  };

  const CurrentGlyph = glyphFor(current?.deviceType ?? "desktop");

  return (
    <div className="px-4.5 pt-[calc(env(safe-area-inset-top)+21px)] pb-12">
      <SettingsHeader back={settingsHref("security")} title="Your Devices" />

      {notice ? (
        <p
          role="status"
          className="mt-4 rounded-tile bg-jumpa-primary-50 px-4 py-3 text-xs leading-4 font-medium text-jumpa-primary-950"
        >
          {notice}
        </p>
      ) : null}

      {loading ? (
        <div className="mt-6 flex flex-col gap-5">
          <div className="h-34 animate-pulse rounded-key bg-jumpa-neutral-50" />
          <div className="h-44 animate-pulse rounded-surface bg-jumpa-neutral-50" />
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-6">
          <SettingSection label="This device">
            <section className="relative isolate overflow-hidden rounded-key bg-[image:var(--gradient-jumpa-hero)] px-5 py-5">
              <Image
                src="/images/home/hero-grid.svg"
                alt=""
                aria-hidden="true"
                width={287}
                height={264}
                className="pointer-events-none absolute -top-8 left-1/2 -z-10 max-w-none -translate-x-1/2"
              />

              <div className="flex items-center gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-panel bg-jumpa-white/22 text-jumpa-white">
                  <CurrentGlyph className="size-6" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-base leading-5 font-semibold text-jumpa-white">
                    {current ? deviceName(current) : "This device"}
                  </p>
                  <p className="mt-1 flex items-center gap-1.5 text-xs leading-4 text-jumpa-white/68">
                    <span className="size-1.5 rounded-full bg-jumpa-success" />
                    Active now
                  </p>
                </div>
              </div>

              <dl className="mt-4 flex items-end justify-between gap-3 border-t border-jumpa-white/22 pt-4 text-jumpa-white">
                <div className="min-w-0">
                  <dt className="text-[10px] leading-3.5 text-jumpa-white/68">
                    Signed in
                  </dt>
                  <dd className="mt-1 truncate text-xs leading-4 font-medium">
                    {current ? formatSignIn(current.createdAt) : "—"}
                  </dd>
                </div>
                <div className="min-w-0 text-right">
                  <dt className="text-[10px] leading-3.5 text-jumpa-white/68">
                    IP address
                  </dt>
                  <dd className="mt-1 truncate text-xs leading-4 font-medium">
                    {current?.ipAddress || "Unknown"}
                  </dd>
                </div>
              </dl>
            </section>
          </SettingSection>

          <SettingSection
            label={
              others.length
                ? `Other devices (${others.length})`
                : "Other devices"
            }
          >
            {others.length ? (
              <>
                <SettingCard>
                  {others.map((session, index) => {
                    const Glyph = glyphFor(session.deviceType);
                    const name = deviceName(session);

                    return (
                      <div key={session.id} className="flex flex-col gap-4">
                        {index > 0 ? <SettingRule /> : null}
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <span className="flex size-10 shrink-0 items-center justify-center rounded-panel bg-jumpa-primary-50 text-jumpa-primary-600">
                              <Glyph className="size-5" />
                            </span>
                            <div className="min-w-0">
                              <p className="truncate text-sm leading-4.5 font-medium text-jumpa-black">
                                {name}
                              </p>
                              <p className={`mt-1 truncate ${META}`}>
                                {deviceTrace(session)}
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              setConfirming({ id: session.id, name })
                            }
                            aria-label={`Log out ${name}`}
                            className="tap flex size-9 shrink-0 items-center justify-center rounded-pill bg-jumpa-warning-50 text-jumpa-warning active:scale-95"
                          >
                            <LogOutIcon className="size-4.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </SettingCard>

                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setConfirming("others")}
                >
                  Log out of all other devices
                </Button>
              </>
            ) : (
              <SettingCard className="items-center py-8 text-center">
                <span className="flex size-12 items-center justify-center rounded-full bg-jumpa-primary-50 text-jumpa-primary-600">
                  <ShieldCheckIcon className="size-6" />
                </span>
                <p className="text-sm leading-4.5 font-medium text-jumpa-black">
                  No other active sessions
                </p>
                <p className={`max-w-60 ${META}`}>
                  You are only signed in here. Anywhere else you sign in will
                  show up on this screen.
                </p>
              </SettingCard>
            )}
          </SettingSection>
        </div>
      )}

      {confirming ? (
        <AccountSheet
          icon={<LogOutIcon className="size-8" />}
          tone="danger"
          title={
            confirming === "others"
              ? "Log out of all other devices?"
              : `Log out ${confirming.name}?`
          }
          error={error}
          confirmLabel="Yes, log out"
          pendingLabel="Logging out..."
          pending={revoking}
          onConfirm={revoke}
          onClose={closeSheet}
        >
          <p className="text-center text-sm leading-5 text-jumpa-neutral-700">
            {confirming === "others"
              ? "Every session except this one ends straight away. Signing back in needs your login PIN."
              : "That session ends straight away. Signing back in needs your login PIN."}
          </p>
        </AccountSheet>
      ) : null}
    </div>
  );
}
