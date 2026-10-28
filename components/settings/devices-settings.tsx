"use client";

import Image from "next/image";
import Link from "next/link";
import { type ReactNode, useCallback, useEffect, useState } from "react";
import { AccountSheet } from "@/components/settings/account-sheet";
import { settingsHref } from "@/components/settings/sections";
import { SettingsHeader } from "@/components/settings/settings-header";
import { Button } from "@/components/ui/button";
import { LogOutIcon } from "@/components/ui/icons/log-out";
import { deviceName, formatSignIn, type SessionItem } from "@/lib/sessions";

const NOTICE_MS = 3500;

const LABEL = "text-sm leading-4 font-medium text-jumpa-black";

/** The current device sits on lavender; every other one is a bordered white card. */
const TONE = {
  current: {
    card: "bg-jumpa-surface px-4.75",
    tile: "bg-jumpa-primary-50 text-jumpa-primary-600",
    pill: "border-jumpa-lavender-275 text-jumpa-primary-950",
  },
  other: {
    card: "border border-jumpa-neutral-95 bg-jumpa-white px-4.5",
    tile: "bg-jumpa-neutral-50 text-jumpa-neutral-450",
    pill: "border-jumpa-neutral-95 text-jumpa-neutral-450",
  },
} as const;

const PILL =
  "tap flex h-7.75 w-19.5 shrink-0 items-center justify-center rounded-pill border text-xs leading-4 font-medium active:scale-95";

/** Which confirmation is up: one device by id, or every other device. */
type Confirming = { id: string; name: string } | "others";

const platform = (s: SessionItem) =>
  [s.browser, s.os].filter(Boolean).join(" on ") || "Unknown browser";

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
        if (data.data?.sessions) setSessions(data.data.sessions);
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
    const all = confirming === "others";

    setRevoking(true);
    setError(null);
    try {
      const query = all ? "target=others" : `id=${encodeURIComponent(confirming.id)}`;
      const res = await fetch(`/api/auth/sessions?${query}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        setError("That didn't go through. Try again in a moment.");
        return;
      }

      setSessions((prev) =>
        all ? prev.filter((s) => s.isCurrent) : prev.filter((s) => s.id !== confirming.id),
      );
      setNotice(all ? "Logged out of every other device." : `${confirming.name} is signed out.`);
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

  return (
    <div className="flex min-h-dvh flex-col px-4.5 pt-[calc(env(safe-area-inset-top)+21px)] pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
      <SettingsHeader size="lg" back={settingsHref("security")} title="Devices" />

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
          <div className="h-21.5 animate-pulse rounded-row bg-jumpa-neutral-50" />
          <div className="h-21.5 animate-pulse rounded-row bg-jumpa-neutral-50" />
        </div>
      ) : (
        <>
          <h2 className={`mt-6 ${LABEL}`}>This device</h2>
          <div className="mt-4.75">
            <DeviceCard
              session={current}
              tone="current"
              status={current?.ipAddress ? `${current.ipAddress} · Active now` : "Active now"}
              action={
                <Link href={settingsHref("signout")} className={`${PILL} ${TONE.current.pill}`}>
                  Signout
                </Link>
              }
            />
          </div>

          <h2 className={`mt-5 ${LABEL}`}>Other devices</h2>
          {others.length ? (
            <ul className="mt-4.75 flex flex-col gap-5">
              {others.map((session) => {
                const name = deviceName(session);
                return (
                  <li key={session.id}>
                    <DeviceCard
                      session={session}
                      tone="other"
                      status={`Last active ${formatSignIn(session.updatedAt)}`}
                      action={
                        <button
                          type="button"
                          onClick={() =>
                            setConfirming({ id: session.id, name })
                          }
                          aria-label={`Log out ${name}`}
                          className={`${PILL} ${TONE.other.pill}`}
                        >
                          Log out
                        </button>
                      }
                    />
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-4.75 flex h-21.5 items-center justify-center rounded-row border border-jumpa-neutral-95 px-6 text-center text-xs leading-[1.4] text-jumpa-ink-muted">
              You're only signed in here. Anywhere else you sign in shows up on
              this screen.
            </p>
          )}

          <p className="mt-5 text-xs leading-[1.4] text-jumpa-ink-muted">
            Don't recognise one of these? Log it out, then change your PIN.
          </p>

          {others.length ? (
            <div className="mt-auto pt-6">
              <Button
                variant="softBrand"
                size="lg"
                onClick={() => setConfirming("others")}
              >
                Log out of all other devices
              </Button>
            </div>
          ) : null}
        </>
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

function DeviceCard({
  session,
  tone,
  status,
  action,
}: {
  session?: SessionItem;
  tone: keyof typeof TONE;
  status: string;
  action: ReactNode;
}) {
  const style = TONE[tone];
  const desktop = (session?.deviceType ?? "desktop") === "desktop";

  return (
    <div className={`flex h-21.5 items-center gap-3.5 rounded-row ${style.card}`}>
      <span
        aria-hidden="true"
        className={`flex size-11.5 shrink-0 items-center justify-center rounded-panel ${style.tile}`}
      >
        {desktop ? (
          <Image
            src="/images/devices/laptop.svg"
            alt=""
            width={24}
            height={24}
            className="size-6"
          />
        ) : (
          <span className="h-6 w-3.5 rounded-sm border-2 border-current" />
        )}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm leading-4.5 font-semibold text-jumpa-ink">
          {session ? deviceName(session) : "This device"}
        </span>
        <span className="truncate text-xs leading-4.5 text-jumpa-ink-muted">
          {session ? platform(session) : "—"}
        </span>
        <span
          className={`truncate text-[10px] leading-3.5 ${
            tone === "current"
              ? "font-medium text-jumpa-success"
              : "text-jumpa-ink-muted"
          }`}
        >
          {status}
        </span>
      </span>
      {action}
    </div>
  );
}
