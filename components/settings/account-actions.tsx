"use client";

import Link from "next/link";
import { useState } from "react";
import { AccountSheet } from "@/components/settings/account-sheet";
import { settingsHref } from "@/components/settings/sections";
import { SettingAction } from "@/components/settings/setting-row";
import {
  SettingCard,
  SettingRule,
  SettingSection,
} from "@/components/settings/setting-section";
import { LogOutIcon } from "@/components/ui/icons/log-out";
import { SealAlertIcon } from "@/components/ui/icons/seal-alert";
import { TrashAltIcon } from "@/components/ui/icons/trash-alt";
import { UserDeleteIcon } from "@/components/ui/icons/user-delete";
import { authClient } from "@/lib/auth-client";

type Sheet = "logout" | "delete" | null;

const COPY = "text-xs leading-4.5 text-jumpa-neutral-500";

/** Log out and delete account. Both confirm before they run. */
export function AccountActions() {
  const [sheet, setSheet] = useState<Sheet>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    if (pending) return;
    setSheet(null);
    setError(null);
  };

  const run = async (
    endpoint: string,
    fallback: string,
    method: "POST" | "DELETE" = "POST",
  ) => {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(endpoint, { method });
      if (!res.ok) {
        let errorMsg = fallback;
        try {
          const body = await res.json();
          if (body?.error) errorMsg = body.error;
        } catch {
          // ignore json parse error
        }
        throw new Error(errorMsg);
      }

      // Explicitly sign out from Better-Auth client to clear reactive in-memory session
      try {
        await authClient.signOut();
      } catch {
        // Ignore client error if server already cleared session
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
      <SettingSection label="Danger Zone">
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
          icon={<UserDeleteIcon className="size-7" />}
          tone="danger"
          title="Delete your account?"
          error={error}
          cancelVariant="brand"
          cancelLabel="Keep My Account"
          confirmVariant="light"
          confirmLabel="Yes, Delete Account"
          pendingLabel="Deleting…"
          pending={pending}
          swapButtons={true}
          onConfirm={() =>
            run("/api/v1/user", "Could not delete the account.", "DELETE")
          }
          onClose={close}
        >
          <div className="rounded-panel bg-jumpa-danger-50 p-3 text-left">
            <div className="flex items-start gap-2.5">
              <p className="text-xs leading-4.5 text-jumpa-neutral-700">
                This <span className="font-semibold text-jumpa-danger">permanently deletes</span> your profile and account history. Your funds will remain in your wallet, but make sure you have{" "}
                <Link
                  href={settingsHref("private-key")}
                  onClick={close}
                  className="font-semibold text-jumpa-anchor-950 underline underline-offset-2 hover:text-jumpa-anchor-900"
                >
                  exported your private key.
                </Link>{" "}
                Jumpa cannot recover your account for you once its deleted.
              </p>
            </div>
          </div>
        </AccountSheet>
      ) : null}
    </>
  );
}
