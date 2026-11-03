import Image from "next/image";

/** The hub's empty plan list: the wallet art over a soft wave, then the message. */
export function HubEmpty({
  title,
  caption,
}: {
  title: string;
  caption: string;
}) {
  return (
    <div className="relative isolate flex h-51.5 flex-col items-center justify-end overflow-hidden rounded-row bg-jumpa-neutral-50 px-4 pb-10 text-center">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
      >
        <Image
          src="/images/savings/empty-wave.svg"
          alt=""
          width={441}
          height={227}
          className="absolute -top-4.5 -left-15.5 max-w-none"
        />
        <Image
          src="/images/savings/empty-blob.svg"
          alt=""
          width={214}
          height={112}
          className="absolute top-29.25 -right-13.25 max-w-none"
        />
        <Image
          src="/images/savings/wallet-plus.webp"
          alt=""
          width={178}
          height={118}
          className="absolute top-4.25 left-1/2 w-44.5 max-w-none -translate-x-1/2"
        />
      </div>
      <p className="text-sm leading-3.5 font-semibold tracking-jumpa-snug text-jumpa-black">
        {title}
      </p>
      <p className="mt-1.25 text-[10px] leading-3.5 tracking-jumpa-snug text-jumpa-violet-900">
        {caption}
      </p>
    </div>
  );
}
