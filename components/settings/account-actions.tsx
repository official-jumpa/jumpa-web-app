"use client";

import { useState } from "react";
import { AccountSheet } from "@/components/settings/account-sheet";
import { SettingAction } from "@/components/settings/setting-row";
import {
  SettingCard,
  SettingRule,
  SettingSection,
} from "@/components/settings/setting-section";
import { CheckIcon } from "@/components/ui/icons/check";
import { LogOutIcon } from "@/components/ui/icons/log-out";
import { SealAlertIcon } from "@/components/ui/icons/seal-alert";
import { TrashAltIcon } from "@/components/ui/icons/trash-alt";

type Sheet = "logout" | "delete" | null;

const COPY = "text-xs leading-4 text-jumpa-neutral-500";

/** Log out and delete account. Both confirm before they run. */
export function AccountActions() {
  const [sheet, setSheet] = useState<Sheet>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);

  const close = () => {
    if (pending) return;
    setSheet(null);
    setError(null);
    setAcknowledged(false);
  };

  const run = async (endpoint: string, fallback: string) => {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(endpoint, { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? fallback);
      }
      // A full load, not router.replace: it applies the cleared cookies, drops
      // Next's client router cache (which would otherwise serve the signed-in
      // tree until a manual refresh) and leaves no session state in memory.
      // `replace` so the back button cannot land on a signed-in screen.
      window.location.replace("/onboarding");
    } catch (err) {
      setError(err instanceof Error ? err.message : fallback);
      setPending(false);
    }
  };

  return (
    <>
      <SettingSection label="Account">
        <SettingCard>
          <SettingAction
            icon={LogOutIcon}
            label="Log Out"
            onClick={() => setSheet("logout")}
          />
          <SettingRule />
          <SettingAction
            icon={TrashAltIcon}
            label="Delete Account"
            danger
            onClick={() => setSheet("delete")}
          />
        </SettingCard>
      </SettingSection>

      {sheet === "logout" ? (
        <AccountSheet
          icon={<LogOutIcon className="size-7" />}
          tone="brand"
          title="Log out of Jumpa?"
          error={error}
          confirmLabel="Yes, Log Out"
          pendingLabel="Logging out…"
          pending={pending}
          onConfirm={() => run("/api/auth/logout", "Could not log you out.")}
          onClose={close}
        >
          <p className={`text-center ${COPY}`}>
            Your wallet stays where it is. Sign back in any time with your email
            to pick up where you left off.
          </p>
        </AccountSheet>
      ) : null}

      {sheet === "delete" ? (
        <AccountSheet
          icon={<TrashAltIcon className="size-7" />}
          tone="danger"
          title="Delete your account?"
          error={error}
          confirmLabel="Yes, Delete Account"
          pendingLabel="Deleting…"
          pending={pending}
          disabled={!acknowledged}
          onConfirm={() =>
            run("/api/auth/delete-account", "Could not delete the account.")
          }
          onClose={close}
        >
          <p className={`text-center ${COPY}`}>
            This removes your profile, chat history and transaction records from
            Jumpa. It cannot be undone.
          </p>

          <p className="flex items-start gap-3 rounded-tile bg-jumpa-danger-50 px-3 py-2.5 text-xs leading-4 text-jumpa-danger">
            <SealAlertIcon className="size-5 shrink-0" />
            Your wallet is self-custodial, so your funds are not deleted, but
            only your recovery phrase can reach them afterwards.
          </p>

          {/* The confirm button stays inert until this is ticked. */}
          <label className="flex cursor-pointer items-center gap-3 rounded-tile bg-jumpa-neutral-50 px-3 py-3 text-xs leading-4 font-medium text-jumpa-black">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(event) => setAcknowledged(event.target.checked)}
              className="peer sr-only"
            />
            <span
              aria-hidden="true"
              className="flex size-5 shrink-0 items-center justify-center rounded-md border-2 border-jumpa-neutral-250 text-transparent transition-colors peer-checked:border-jumpa-danger peer-checked:bg-jumpa-danger peer-checked:text-jumpa-white"
            >
              <CheckIcon className="size-3.5" />
            </span>
            I have my recovery phrase saved
          </label>
        </AccountSheet>
      ) : null}
    </>
  );
}
