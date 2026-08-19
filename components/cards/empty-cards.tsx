import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ScreenHeader } from "@/components/ui/screen-header";

const PERKS = [
  "One transaction only",
  "Highest security",
  "Auto-expires after use",
  "Instantly generated",
  "Zero cost",
];

/** Shown until the first card exists. The artwork bleeds off both edges. */
export function EmptyCards() {
  return (
    <div className="relative isolate flex min-h-dvh flex-col overflow-hidden px-4.5 pt-[calc(env(safe-area-inset-top)+1.5rem)] pb-[calc(env(safe-area-inset-bottom)+2.5rem)]">
      <Image
        src="/images/cards/cards-stack.webp"
        alt=""
        width={2044}
        height={1362}
        priority
        className="pointer-events-none absolute -top-15.5 left-1/2 -z-10 w-[1022px] max-w-none -translate-x-[511px]"
      />

      <ScreenHeader back="/home" title="Your Virtual Cards" />

      <div className="mt-auto flex flex-col gap-6">
        <h2 className="text-center text-[28px] leading-8.5 font-bold text-jumpa-black">
          Your money, behind a digital card
        </h2>

        {/* The odd last perk centres itself across both columns. */}
        <ul className="mx-auto grid w-70 grid-cols-2 gap-x-4 gap-y-2 text-xs leading-5 text-jumpa-black">
          {PERKS.map((perk, index) => (
            <li
              key={perk}
              className={
                index === PERKS.length - 1 && PERKS.length % 2 === 1
                  ? "col-span-2 text-center whitespace-nowrap"
                  : "whitespace-nowrap"
              }
            >
              ✓ {perk}
            </li>
          ))}
        </ul>

        <Button
          variant="gradientSheet"
          size="lg"
          href="/cards"
          className="mt-6"
        >
          Create new card
        </Button>
      </div>
    </div>
  );
}
