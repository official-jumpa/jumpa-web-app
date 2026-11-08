"use client";

import Image from "next/image";
import { useState } from "react";
import { HEADER_CONTROL } from "@/components/home/wallet-header";
import { MessageCircleQuestionIcon } from "@/components/ui/icons/message-circle-question";
import { shortenAddress } from "@/lib/transfer";
import { ACCOUNT } from "@/lib/wallet";
import { NimiqSupportSheet } from "./nimiq-support";

/** Home's header as the main app draws it, with the Nimiq Pay wallet in place of the account name. */
export function NimiqHeader({
  address,
  onOpenMe,
}: {
  address: string;
  onOpenMe: () => void;
}) {
  const [helpOpen, setHelpOpen] = useState(false);

  return (
    <header className="flex items-center justify-between">
      <button
        type="button"
        onClick={onOpenMe}
        className="tap flex items-center gap-2 text-left active:scale-95"
      >
        <span className="relative block size-10 shrink-0 rounded-full bg-jumpa-primary-100">
          <Image
            src={ACCOUNT.avatar}
            alt=""
            width={40}
            height={40}
            priority
            unoptimized
            className="size-10 rounded-full object-cover"
          />
          <Image
            src="/coins/pol.webp"
            alt="Polygon"
            width={18}
            height={18}
            className="absolute -right-0.5 -bottom-0.5 size-4.5 rounded-full ring-2 ring-jumpa-white"
          />
        </span>
        <p className="flex flex-col text-sm leading-4 font-bold tracking-jumpa-snug text-jumpa-ink">
          <span className="font-normal text-jumpa-neutral-475">
            Hello<span aria-hidden="true">👋</span>
          </span>
          <span className="max-w-32.5 truncate">
            {shortenAddress(address, 6, 4)}
          </span>
        </p>
      </button>

      <button
        type="button"
        onClick={() => setHelpOpen(true)}
        aria-label="Help and support"
        className={HEADER_CONTROL}
      >
        <MessageCircleQuestionIcon className="size-6" />
      </button>

      {helpOpen ? (
        <NimiqSupportSheet onClose={() => setHelpOpen(false)} />
      ) : null}
    </header>
  );
}
