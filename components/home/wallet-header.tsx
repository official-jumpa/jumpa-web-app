"use client";

import Image from "next/image";
import Link from "next/link";
import { SupportSheet } from "@/components/support/support-sheet";
import { BellIcon } from "@/components/ui/icons/bell";
import { VerifiedBadgeIcon } from "@/components/ui/icons/verified-badge";
import { useEffect, useState } from "react";
import { useAuthContext } from "@/components/auth/AuthGuard";
import { useUserProfile } from "@/components/profile/user-profile-provider";
import { ACCOUNT } from "@/lib/wallet";

// No colour here: a second `text-*` from a consumer would not reliably win,
// since the joins in this file are plain concatenation.
const CONTROL =
  "relative flex size-10 items-center justify-center rounded-full bg-jumpa-white/43";

export function WalletHeader({ initialHasUnread = false }: { initialHasUnread?: boolean }) {
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
        const res = await fetch("/api/notifications?limit=1&unreadOnly=true", {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = await res.json();
        if (live) setHasUnread(data.unreadCount > 0);
      } catch {}
    };

    checkUnread();
    const onWake = () => {
      if (document.visibilityState === "visible") checkUnread();
    };
    document.addEventListener("visibilitychange", onWake);
    window.addEventListener("focus", checkUnread);
    window.addEventListener("pageshow", checkUnread);
    return () => {
      live = false;
      document.removeEventListener("visibilitychange", onWake);
      window.removeEventListener("focus", checkUnread);
      window.removeEventListener("pageshow", checkUnread);
    };
  }, []);

  let displayName = ACCOUNT.firstName;
  if (profile?.nickname) {
    displayName = profile.nickname;
  } else if (profile?.name) {
    displayName = profile.name.split(" ")[0];
  } else if (user?.nickname) {
    displayName = user.nickname;
  } else if (user?.name) {
    displayName = user.name.split(" ")[0];
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
        <span className="relative justify-center items-center block size-10 shrink-0 bg-jumpa-primary-100 rounded-full p-1">
          <Image
            src={user?.image || ACCOUNT.avatar}
            alt=""
            width={40}
            height={40}
            priority
            className="size-8 rounded-full object-cover"
          />
          {ACCOUNT.verified ? (
            <VerifiedBadgeIcon className="absolute top-0 left-7 size-4.5" />
          ) : null}
        </span>
        <p className="flex flex-col text-base leading-4 text-jumpa-white">
          <span className="font-medium">
            <span className="text-jumpa-white/68 font-semibold">Hello</span>,
          </span>
          <span className="font-bold lowercase">{displayName}</span>
        </p>
      </Link>

      <div className="flex items-center gap-2">
        {/* The design raises the chooser here rather than navigating; the
            same list lives at /support for a direct load. */}
        <button
          type="button"
          onClick={() => setHelpOpen(true)}
          aria-label="Help and support"
          className={`${CONTROL} tap active:scale-95`}
        >
          {/* HELP tucks into the top-right corner, so the headset is nudged
              down and left to leave it room inside the 40px disc. */}
          <Image
            src="/images/home/supporticon.png"
            alt=""
            width={50}
            height={50}
            className="mt-[3px] mr-0.5 size-5.5"
          />
          <span className="absolute -top-px -right-0.5 rounded-pill bg-jumpa-danger-100 px-[3px] text-[6px] leading-[10px] font-bold tracking-wide text-jumpa-danger">
            HELP
          </span>
        </button>

        <Link
          href="/notifications"
          prefetch={true}
          aria-label="Notifications"
          className={`${CONTROL} text-jumpa-primary-50`}
        >
          <BellIcon className="size-6" />
          {hasUnread ? (
            <span className="absolute top-2 right-2 size-2 rounded-full bg-jumpa-danger ring-2 ring-jumpa-primary-600 animate-pulse" />
          ) : null}
        </Link>
      </div>

      {helpOpen ? <SupportSheet onClose={() => setHelpOpen(false)} /> : null}
    </header>
  );
}
