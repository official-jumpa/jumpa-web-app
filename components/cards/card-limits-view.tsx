"use client";

import { useState } from "react";
import { CardSettings } from "@/components/cards/card-settings";
import { ConfirmSheet } from "@/components/cards/confirm-sheet";
import { UsageLimit } from "@/components/cards/usage-limit";
import { BottomNav } from "@/components/home/bottom-nav";
import { CoinFrontIcon } from "@/components/ui/icons/coin-front";
import { SealAlertIcon } from "@/components/ui/icons/seal-alert";
import { ScreenHeader } from "@/components/ui/screen-header";
import type { UsageLimit as Limit } from "@/lib/cards";

/** Spend limits per channel, with the same settings block as the cards screen. */
export function CardLimitsView({
  tier,
  limits,
}: {
  tier: string;
  limits: Limit[];
}) {
  const [deleting, setDeleting] = useState(false);

  return (
    <>
      <div className="flex flex-col gap-8 px-4.5 pt-[calc(env(safe-area-inset-top)+1.5rem)] pb-30">
        <ScreenHeader
          back="/cards"
          title="Card Limits"
          action={
            <span className="flex h-10.5 items-center gap-2 rounded-pill bg-jumpa-alt-400 px-2.75 text-xs leading-3.5 font-medium text-jumpa-alt-950">
              {tier}
              <CoinFrontIcon className="size-6" />
            </span>
          }
        />

        <div className="flex flex-col gap-6">
          {limits.map((limit) => (
            <UsageLimit key={limit.label} limit={limit} />
          ))}
        </div>

        <CardSettings onDelete={() => setDeleting(true)} />
      </div>

      <BottomNav />

      {deleting ? (
        <ConfirmSheet
          art={{
            src: "/images/cards/delete-bin.svg",
            width: 81,
            height: 93,
            className: "w-20.25",
          }}
          title="Delete Virtual Card?"
          noteIcon={<SealAlertIcon className="size-5 text-jumpa-danger" />}
          note="This action is permanent. Once deleted, this virtual card can't be restored or used for future transactions."
          confirmLabel="Yes, Delete"
          // No card service yet, so confirming just dismisses.
          onConfirm={() => setDeleting(false)}
          onClose={() => setDeleting(false)}
        />
      ) : null}
    </>
  );
}
