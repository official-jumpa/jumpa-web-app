"use client";

import { useRouter } from "next/navigation";
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
import { TrashAltIcon } from "@/components/ui/icons/trash-alt";
import { endSession } from "@/lib/account-session";

const COPY = "text-xs leading-4.5 text-jumpa-neutral-500";

/** Log out confirms in a sheet; Delete Account opens its own screen. */
export function AccountActions() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    if (pending) return;
    setOpen(false);
    setError(null);
  };

  const logout = async () => {
    setPending(true);
    setError(null);
    const failed = await endSession("/api/auth/logout", "Could not log you out.");
    if (failed) {
      setError(failed);
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
            onClick={() => setOpen(true)}
          />
          <SettingRule />
          <SettingAction
            icon={TrashAltIcon}
            label="Delete Account"
            danger
            onClick={() => router.push(settingsHref("delete"))}
          />
        </SettingCard>
      </SettingSection>

      {open ? (
        <AccountSheet
          icon={<LogOutIcon className="size-7" />}
          tone="brand"
          title="Log out of Jumpa?"
          error={error}
          confirmLabel="Yes, Log Out"
          pendingLabel="Logging out…"
          pending={pending}
          onConfirm={logout}
          onClose={close}
        >
          <p className={`text-center ${COPY}`}>
            Your wallet stays where it is. Sign back in any time with your email
            to pick up where you left off.
          </p>
        </AccountSheet>
      ) : null}
    </>
  );
}
