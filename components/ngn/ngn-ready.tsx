import Image from "next/image";
import { Button } from "@/components/ui/button";

/** The account exists. "View Account" opens its details; "Done" leaves. */
export function NgnReady({ detailsHref }: { detailsHref: string }) {
  return (
    <>
      <h1 className="mt-7.25 text-[28px] leading-7.5 font-semibold text-jumpa-black">
        Your NGN account is ready
      </h1>
      <p className="mt-2 text-sm leading-4 text-jumpa-black">
        You can now receive and manage NGN with Jumpa.
      </p>

      <div className="flex min-h-0 flex-1 items-center justify-center py-8">
        <Image
          src="/images/usd/ngncoin.svg"
          alt=""
          width={604}
          height={648}
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
