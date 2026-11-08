"use client";

import Image from "next/image";
import Link from "next/link";
import { SupportSheet } from "@/components/support/support-sheet";
import { BellIcon } from "@/components/ui/icons/bell";
import { MessageCircleQuestionIcon } from "@/components/ui/icons/message-circle-question";
import { VerifiedBadgeIcon } from "@/components/ui/icons/verified-badge";
import { useEffect, useState } from "react";
import { useAuthContext } from "@/components/auth/AuthGuard";
import { useUserProfile } from "@/components/profile/user-profile-provider";
import { onNotificationsRefresh } from "@/lib/client-events";
import { ACCOUNT } from "@/lib/wallet";

// No colour here: a second `text-*` from a consumer would not reliably win,
// since the joins in this file are plain concatenation.
export const HEADER_CONTROL =
  "relative flex size-10 items-center justify-center rounded-row bg-jumpa-neutral-50 " +
  "text-jumpa-primary-600 tap active:scale-95";

export function WalletHeader({
  initialHasUnread = false,
  kycVerified = false,
}: {
  initialHasUnread?: boolean;
  /** The tick is a verification mark, so it only appears once KYC is approved. */
  kycVerified?: boolean;
}) {
  const auth = useAuthContext();
  const { profile } = useUserProfile();
  const user = auth?.user;
  const [hasUnread, setHasUnread] = useState(initialHasUnread);
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    let live = true;
    // The server value only seeds the first paint. It has to be re-checked on
    // every mount, and again whenever the tab comes back: marking the last
    // notification read happens on another screen, and the dot was seeded
    // `true` and never asked again, so it stayed lit with nothing to read.
    const checkUnread = async () => {
      try {
        const res = await fetch(
          "/api/v1/notifications?limit=1&unreadOnly=true",
          {
            cache: "no-store",
          },
        );
        if (!res.ok) return;
        const data = await res.json();
        const payload = data.data ?? data;
        if (live) setHasUnread((payload.unreadCount ?? 0) > 0);
      } catch {}
    };

    const hasInitialSeed = initialHasUnread !== undefined;
    if (!hasInitialSeed) {
      checkUnread();
    }
    const onWake = () => {
      if (document.visibilityState === "visible") checkUnread();
    };
    document.addEventListener("visibilitychange", onWake);
    window.addEventListener("focus", checkUnread);
    window.addEventListener("pageshow", checkUnread);
    const unsubscribeNotifications = onNotificationsRefresh(checkUnread);
    return () => {
      live = false;
      document.removeEventListener("visibilitychange", onWake);
      window.removeEventListener("focus", checkUnread);
      window.removeEventListener("pageshow", checkUnread);
      unsubscribeNotifications();
    };
  }, []);

  let displayName = ACCOUNT.firstName;
  if (profile?.nickname) {
    displayName = profile.nickname;
  } else if (profile?.name) {
    displayName = profile.name;
  } else if (user?.nickname) {
    displayName = user.nickname;
  } else if (user?.name) {
    displayName = user.name;
  } else if (user?.email) {
    const rawName = user.email.split("@")[0];
    displayName = rawName.charAt(0).toUpperCase() + rawName.slice(1);
  }

  return (
    <header className="flex items-center justify-between">
      <Link
        prefetch
        href="/profile"
        className="flex items-center gap-2 tap active:scale-95"
      >
        <span className="relative block size-10 shrink-0 rounded-full bg-jumpa-primary-100">
          <Image
            src={user?.image || ACCOUNT.avatar}
            alt=""
            width={40}
            height={40}
            priority
            unoptimized
            className="size-10 rounded-full object-cover"
          />
          {kycVerified ? (
            <VerifiedBadgeIcon className="absolute -top-0.5 left-7 size-4.5" />
          ) : null}
        </span>
        <p className="flex flex-col text-sm leading-4 font-bold tracking-jumpa-snug text-jumpa-ink">
          <span className="font-normal text-jumpa-neutral-475">
            Hello<span aria-hidden="true">👋</span>
          </span>
          <span className="max-w-32.5 truncate">{displayName}</span>
        </p>
      </Link>

      <div className="flex items-center gap-2">
        {/* The design raises the chooser here rather than navigating; the
            same list lives at /support for a direct load. */}
        <button
          type="button"
          onClick={() => setHelpOpen(true)}
          aria-label="Help and support"
          className={HEADER_CONTROL}
        >
          <MessageCircleQuestionIcon className="size-6" />
        </button>

        <Link
          href="/notifications"
          prefetch={true}
          aria-label="Notifications"
          className={HEADER_CONTROL}
        >
          <BellIcon className="size-6" />
          {hasUnread ? (
            <span className="absolute top-0.5 right-2 size-2 rounded-full bg-jumpa-danger ring-2 ring-jumpa-neutral-50 animate-pulse" />
          ) : null}
        </Link>
      </div>

      {helpOpen ? <SupportSheet onClose={() => setHelpOpen(false)} /> : null}
    </header>
  );
}
