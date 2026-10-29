import Image from "next/image";
import { JumpaLoader } from "@/components/ui/jumpa-loader";

const RING = "col-start-1 row-start-1";

/** Medallion, amount and outcome line for a settled transaction. */
export function SuccessHero({
  amount,
  status,
}: {
  amount: string;
  status: string;
}) {
  return (
    <div className="-mt-4 flex flex-col items-center text-center">
      <div className="relative h-28.5 w-35.5">
        <Image
          src="/images/receipt/medallion.svg"
          alt=""
          width={114}
          height={114}
          className="absolute top-0 left-3.75"
          priority
        />
        <Image
          src="/images/receipt/dot-green.svg"
          alt=""
          width={7}
          height={7}
          className="absolute top-8.75 left-32.75"
        />
        <Image
          src="/images/receipt/dot-purple.svg"
          alt=""
          width={7}
          height={7}
          className="absolute top-14.75 left-0"
        />
      </div>
      <p className="mt-6.25 max-w-full truncate text-[34px] leading-7.5 font-semibold tracking-tight text-jumpa-black">
        {amount}
      </p>
      <p className="mt-2.25 text-sm leading-5 font-medium text-jumpa-grey-500">
        {status}
      </p>
    </div>
  );
}

// TODO: no Figma frame for a pending receipt yet; confirm with design.
export function PendingHero({ amount }: { amount: string }) {
  return (
    <div className="flex flex-col items-center text-center">
      <JumpaLoader label="Transaction pending" />
      <p className="mt-4 max-w-full truncate text-[34px] leading-7.5 font-semibold tracking-tight text-jumpa-black">
        {amount}
      </p>
      <p className="mt-2.25 text-sm leading-5 font-medium text-jumpa-grey-500">
        Transaction pending
      </p>
    </div>
  );
}

const CONFETTI = [
  {
    src: "confetti-1",
    w: 14.0073,
    h: 14.2931,
    box: "top-10.5 left-[calc(50%-80.5px)] h-[14.158px] w-[14.44px]",
    turn: "rotate-[89.39deg]",
  },
  {
    src: "confetti-2",
    w: 24.5,
    h: 25,
    box: "top-19.5 left-[calc(50%+51.5px)] h-6.25 w-[24.5px]",
    turn: "",
  },
  {
    src: "confetti-3",
    w: 18.3943,
    h: 18.7697,
    box: "top-22.5 left-[calc(50%-61.5px)] h-[22.625px] w-[22.891px]",
    turn: "-rotate-75",
  },
  {
    src: "confetti-4",
    w: 17,
    h: 20,
    box: "top-5 left-[calc(50%+60.5px)] h-5 w-4.25",
    turn: "",
  },
] as const;

/** Concentric rings around a cross, with the explanation underneath. */
export function FailedHero() {
  return (
    <div className="relative -mt-3.5 flex flex-col items-center text-center">
      <div className="grid place-items-center">
        <Image
          src="/images/receipt/failed-ring-1.svg"
          alt=""
          width={114}
          height={114}
          className={RING}
          priority
        />
        <Image
          src="/images/receipt/failed-ring-2.svg"
          alt=""
          width={83.7551}
          height={83.7551}
          className={RING}
        />
        <Image
          src="/images/receipt/failed-ring-3.svg"
          alt=""
          width={54.6685}
          height={54.6685}
          className={RING}
        />
        <Image
          src="/images/receipt/failed-x.svg"
          alt=""
          width={16}
          height={16}
          className={RING}
        />
      </div>
      {CONFETTI.map((piece) => (
        <span
          key={piece.src}
          className={`absolute flex items-center justify-center ${piece.box}`}
        >
          <Image
            src={`/images/receipt/${piece.src}.svg`}
            alt=""
            width={piece.w}
            height={piece.h}
            className={piece.turn}
          />
        </span>
      ))}
      <h1 className="mt-7.5 text-xl leading-5 font-semibold tracking-jumpa-snug text-jumpa-black">
        Transaction Failed
      </h1>
      <p className="mt-5 w-57.5 text-xs leading-3.75 text-jumpa-slate-600">
        Something went wrong. Your funds have not been sent. Please try again or
        contact support if the issue persists.
      </p>
    </div>
  );
}
