import Image from "next/image";
import { Button } from "@/components/ui/button";

/** The account exists. "View Account" opens its details; "Done" leaves. */
export function UsdReady({ detailsHref }: { detailsHref: string }) {
  return (
    <>
      <h1 className="mt-7.25 text-[28px] leading-7.5 font-semibold text-jumpa-black">
        Your USD account is ready
      </h1>
      <p className="mt-2 text-sm leading-4 text-jumpa-black">
        You can now receive and manage USD with Jumpa.
      </p>

      {/* Takes the slack between the copy and the footer, so a short screen
          shrinks the coin instead of pushing the buttons off. */}
      <div className="flex min-h-0 flex-1 items-center justify-center py-8">
        <Image
          src="/images/usd/coin-ready.webp"
          alt=""
          width={440}
          height={472}
          priority
          className="max-h-full w-55 max-w-full object-contain"
        />
      </div>

      <div className="mt-auto flex flex-col gap-2">
        <Button variant="gradient" size="lg" href={detailsHref}>
          View Account
        </Button>
        <Button variant="softStrong" size="lg" href="/home">
          Done
        </Button>
      </div>
    </>
  );
}
