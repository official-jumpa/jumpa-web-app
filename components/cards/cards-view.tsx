"use client";

import Link from "next/link";
import { useState } from "react";
import { CardActions } from "@/components/cards/card-actions";
import { CardDetailsSheet } from "@/components/cards/card-details-sheet";
import { CardPinSheet } from "@/components/cards/card-pin-sheet";
import { CardSettings } from "@/components/cards/card-settings";
import { ConfirmSheet } from "@/components/cards/confirm-sheet";
import { VirtualCardFace } from "@/components/cards/virtual-card";
import { BottomNav } from "@/components/home/bottom-nav";
import { PromotionList } from "@/components/home/promotion-list";
import { PlusIcon } from "@/components/ui/icons/plus";
import { SealAlertIcon } from "@/components/ui/icons/seal-alert";
import { SnowIcon } from "@/components/ui/icons/snow";
import { ScreenHeader } from "@/components/ui/screen-header";
import type { VirtualCard } from "@/lib/cards";
import type { Promotion } from "@/lib/wallet";

type Sheet = "details" | "pin" | "freeze" | "delete" | null;

/** Cards screen. Every action on it opens one of four sheets. */
export function CardsView({
  cards,
  promotions,
}: {
  cards: VirtualCard[];
  promotions: Promotion[];
}) {
  const [sheet, setSheet] = useState<Sheet>(null);
  const [active, setActive] = useState(0);
  const card = cards[active];
  const close = () => setSheet(null);

  return (
    <>
      <div className="flex flex-col gap-6 px-4.5 pt-[calc(env(safe-area-inset-top)+1.5rem)] pb-30">
        <div className="flex flex-col gap-2">
          <ScreenHeader
            back="/home"
            action={
              <Link
                href="/cards/new"
                className="flex h-9.5 items-center gap-2 rounded-pill border border-jumpa-primary-600 px-3 text-xs leading-3.5 font-medium text-jumpa-primary-600"
              >
                <PlusIcon className="size-4" />
                Add new card
              </Link>
            }
          />
          <h1 className="text-base leading-4.5 font-semibold text-jumpa-black">
            Your Virtual Cards
          </h1>
        </div>

        <div className="flex flex-col gap-4">
          <VirtualCardFace card={card} />

          {cards.length > 1 ? (
            <div className="mx-auto flex h-3.5 items-center gap-1 rounded-pill bg-jumpa-primary-50 px-0.5">
              {cards.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  aria-label={`Card ending ${item.last4}`}
                  aria-current={index === active}
                  onClick={() => setActive(index)}
                  className={`h-2.5 rounded-pill transition-[width] ${
                    index === active
                      ? "w-10.5 bg-jumpa-primary-600"
                      : "w-4 bg-jumpa-primary-100"
                  }`}
                />
              ))}
            </div>
          ) : null}
        </div>

        <CardActions
          frozen={card.frozen}
          onDetails={() => setSheet("details")}
          onFreeze={() => setSheet("freeze")}
          onPin={() => setSheet("pin")}
        />

        <PromotionList promotions={promotions} />
        <CardSettings onDelete={() => setSheet("delete")} />
      </div>

      <BottomNav />

      {sheet === "details" ? (
        <CardDetailsSheet card={card} onClose={close} />
      ) : null}

      {sheet === "pin" ? <CardPinSheet pin={card.pin} onClose={close} /> : null}

      {sheet === "freeze" ? (
        <ConfirmSheet
          art={{
            src: "/images/cards/freeze_main.svg",
            width: 127,
            height: 93,
            className: "w-31.75",
          }}
          title="Freeze Virtual Card?"
          noteIcon={<SnowIcon className="size-5 text-jumpa-black" />}
          note="Freezing this card will temporarily stop all new transactions. You can unfreeze it anytime to start using the card again."
          warning="Any recurring payments or pending transactions may be affected while the card is frozen. Make sure you're not relying on this card for an urgent payment."
          confirmLabel="Yes, Freeze"
          // No card service yet, so confirming just dismisses.
          onConfirm={close}
          onClose={close}
        />
      ) : null}

      {sheet === "delete" ? (
        <ConfirmSheet
          art={{
            src: "/images/cards/delete_main.svg",
            width: 113,
            height: 120,
            className: "",
          }}
          title="Delete Virtual Card?"
          noteIcon={<SealAlertIcon className="size-5 text-jumpa-danger" />}
          note="This action is permanent. Once deleted, this virtual card can't be restored or used for future transactions."
          confirmLabel="Yes, Delete"
          onConfirm={close}
          onClose={close}
        />
      ) : null}
    </>
  );
}
