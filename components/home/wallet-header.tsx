"use client";

import Image from "next/image";
import Link from "next/link";
import { BellIcon } from "@/components/ui/icons/bell";
import { VerifiedBadgeIcon } from "@/components/ui/icons/verified-badge";
import { useAuthContext } from "@/components/auth/AuthGuard";
import { ACCOUNT } from "@/lib/wallet";

export function WalletHeader() {
  const auth = useAuthContext();
  const user = auth?.user;

  let displayName = ACCOUNT.firstName;
  if (user?.name) {
    displayName = user.name.split(" ")[0];
  } else if (user?.email) {
    const rawName = user.email.split("@")[0];
    displayName = rawName.charAt(0).toUpperCase() + rawName.slice(1);
  }

  return (
    <header className="flex items-center justify-between">
      <Link
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

      <Link
        href="/notifications"
        aria-label="Notifications"
        className="flex size-10 items-center justify-center rounded-full bg-jumpa-white/43 text-jumpa-primary-50"
      >
        <BellIcon className="size-6" />
      </Link>
    </header>
  );
}
