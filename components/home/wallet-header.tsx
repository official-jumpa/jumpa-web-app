"use client";

import Image from "next/image";
import Link from "next/link";
import { BellIcon } from "@/components/ui/icons/bell";
import { VerifiedBadgeIcon } from "@/components/ui/icons/verified-badge";
import { useSession } from "@/lib/auth-client";
import { ACCOUNT } from "@/lib/wallet";

export function WalletHeader() {
  const { data: session } = useSession();

  let displayName = ACCOUNT.firstName;
  if (session?.user?.name) {
    displayName = session.user.name.split(" ")[0];
  } else if (session?.user?.email) {
    const rawName = session.user.email.split("@")[0];
    displayName = rawName.charAt(0).toUpperCase() + rawName.slice(1);
  }

  return (
    <header className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="relative block size-10 shrink-0">
          <Image
            src={session?.user?.image || ACCOUNT.avatar}
            alt=""
            width={40}
            height={40}
            priority
            className="size-10 rounded-full object-cover"
          />
          {ACCOUNT.verified ? (
            <VerifiedBadgeIcon className="absolute top-0 left-7 size-4.5" />
          ) : null}
        </span>
        <p className="flex flex-col text-base leading-4 text-jumpa-white">
          <span className="font-medium">
            <span className="text-jumpa-white/68">Good Morning</span>👋,
          </span>
          <span className="font-bold">{displayName}</span>
        </p>
      </div>

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
