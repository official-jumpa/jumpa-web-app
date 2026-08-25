import Image from "next/image";
import { RingedButton } from "@/components/ui/ringed-button";
import { ScreenHeader } from "@/components/ui/screen-header";
import { CARD_PERKS } from "@/lib/cards";

/** First step of the create flow, and the whole screen until a card exists. */
export function CardIntro({ back }: { back: string }) {
  return (
    <div className="flex min-h-dvh flex-col px-4.5 pt-[calc(env(safe-area-inset-top)+1.5rem)] pb-[calc(env(safe-area-inset-bottom)+2rem)]">
      <ScreenHeader back={back} title="Your Virtual Cards" round />

      {/* Full-bleed at every size: the artwork keeps the column's width and gives
          up height instead, so the copy below it always has room. */}
      <div className="relative -mx-4.5 mt-2 mb-5 min-h-32 flex-1 overflow-hidden">
        <Image
          src="/images/cards/cards-hero.webp"
          alt=""
          width={786}
          height={736}
          sizes="450px"
          priority
          className="absolute top-0 left-0 h-auto w-full"
        />

        {/* Softens the cut where a short screen clips the artwork. */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-linear-to-t from-jumpa-white to-transparent" />
      </div>

      <div className="flex flex-col items-center gap-5">
        <h2 className="text-center text-[32px] leading-8.5 font-semibold text-jumpa-black">
          Your money, behind a digital card
        </h2>

        {/* The odd last perk centres itself across both columns. */}
        <ul className="mx-auto grid w-70 grid-cols-2 gap-x-4 gap-y-2 text-xs leading-5 text-jumpa-black">
          {CARD_PERKS.map((perk, index) => (
            <li
              key={perk}
              className={
                index === CARD_PERKS.length - 1 && CARD_PERKS.length % 2 === 1
                  ? "col-span-2 text-center whitespace-nowrap"
                  : "whitespace-nowrap"
              }
            >
              ✓ {perk}
            </li>
          ))}
        </ul>

        <RingedButton href="/cards/new/type">Create new card</RingedButton>
      </div>
    </div>
  );
}
