"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import { useState } from "react";
import { PromotionList } from "@/components/home/promotion-list";
import { TransferHeader } from "@/components/transfer/transfer-header";
import { Button } from "@/components/ui/button";
import { ShareArrowIcon } from "@/components/ui/icons/share-arrow";
import { ShieldCheckIcon } from "@/components/ui/icons/shield-check";
import type { Promotion } from "@/lib/wallet";

const ACTION =
  "tap flex h-13 flex-1 items-center justify-center gap-2 rounded-tile bg-jumpa-neutral-50 " +
  "text-base leading-4 font-medium text-jumpa-black active:scale-[0.98]";

/**
 * Terminal screen for every transfer. "More details" swaps the offer cards for
 * the receipt, which is the second frame the design draws for this screen.
 */
export function TransferSuccess({
  back,
  amount,
  title = "Payment Successful",
  note,
  details,
  promotions,
  ctaLabel = "Go to Home",
  ctaHref = "/home",
  /** Swap puts its title above the amount; the send flows put it below. */
  titleFirst,
  actionsFirst,
  actions: actionsOverride,
  onShare,
}: {
  back: string;
  amount: string;
  title?: string;
  note?: ReactNode;
  /** Receipt rows revealed by "More details". */
  details?: ReactNode;
  promotions: Promotion[];
  ctaLabel?: string;
  ctaHref?: string;
  titleFirst?: boolean;
  /** Swap draws the action row above the offer cards; the send flows below. */
  actionsFirst?: boolean;
  /** Replaces the More details / Share pair, as the bill flows do. */
  actions?: ReactNode;
  onShare?: () => void;
}) {
  const [showDetails, setShowDetails] = useState(false);

  const heading = (
    <p className="text-[54px] leading-14.5 font-bold text-jumpa-black">
      {amount}
    </p>
  );
  const caption = (
    <p className="text-xl leading-6.75 font-medium text-jumpa-black">{title}</p>
  );

  const slot =
    showDetails && details ? (
      details
    ) : (
      <PromotionList promotions={promotions} />
    );

  const actions = actionsOverride ?? (
    <div className="flex h-17.5 items-center gap-2 rounded-card border border-jumpa-neutral-100 p-2.25">
      {showDetails ? null : (
        <button
          type="button"
          onClick={() => setShowDetails(true)}
          disabled={!details}
          className={`${ACTION} disabled:opacity-50`}
        >
          <ShieldCheckIcon className="size-6 text-jumpa-primary-600" />
          More details
        </button>
      )}
      <button type="button" onClick={onShare} className={ACTION}>
        <ShareArrowIcon className="size-6 text-jumpa-primary-600" />
        Share
      </button>
    </div>
  );

  return (
    <div className="flex min-h-dvh flex-col px-4.5 pt-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
      <TransferHeader
        back={back}
        action={
          <Image
            src="/logo/wordmark/purple.png"
            alt="Jumpa"
            width={384}
            height={80}
            className="h-5.25 w-24"
          />
        }
      />

      <div className="mt-11.5 flex flex-col items-center text-center">
        {/* The export carries the glow bleed; negative margins collapse it to the badge. */}
        <Image
          src="/images/transfer/payment-success.svg"
          alt=""
          width={199}
          height={250}
          priority
          className="-mt-7.75 -mb-20.5 h-62.5 w-49.75 max-w-none"
        />

        <div className="mt-8.75 flex flex-col items-center gap-1">
          {titleFirst ? caption : heading}
          {titleFirst ? heading : caption}
          {note ? (
            <p className="text-xs leading-5 text-jumpa-black">{note}</p>
          ) : null}
        </div>
      </div>

      {/* mt-auto alone: any top padding here pushes the receipt state off screen. */}
      <div className="mt-auto flex flex-col gap-4.5">
        {actionsFirst ? actions : slot}
        {actionsFirst ? slot : actions}

        <Button variant="gradient" size="lg" href={ctaHref}>
          {ctaLabel}
        </Button>
      </div>
    </div>
  );
}
