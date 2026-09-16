import Image from "next/image";
import type { CSSProperties } from "react";
import { ArrowDownArrowUpIcon } from "@/components/ui/icons/arrow-down-arrow-up";
import { CircleUserIcon } from "@/components/ui/icons/circle-user";
import { LockIcon } from "@/components/ui/icons/lock";
import { UsersIcon } from "@/components/ui/icons/users";
import { getAssetLogo } from "@/lib/assets";
import { cn } from "@/lib/cn";
import { FLAGS } from "@/lib/flags";
import { RECEIVE_CARD, SAVE_CARD, SEND_CARD, SWAP_CARD } from "@/lib/landing";

/**
 * The four artwork cards in the Features scroller. Each is its own 507-unit
 * frame, so every number below is a design px of the card and the whole
 * composition scales with the card's width.
 */
const FRAME = "frame-507 aspect-square w-221.5 shrink-0 md:w-507";
const SURFACE = "relative isolate size-full overflow-clip rounded-u-32.5";

/**
 * The section owns how a card arrives, so the reveal marker and its `--i` come
 * in from there — the card only has to let them reach its frame.
 */
type CardProps = { className?: string; style?: CSSProperties };

const LIME = "bg-[image:var(--gradient-jumpa-card-lime)]";
const PURPLE = "bg-[image:var(--gradient-jumpa-card-purple)]";

const TITLE = "font-semibold tracking-jumpa";
const BODY = "font-medium tracking-jumpa";

/** The dot-grid haze on the purple cards: a grid behind a blurred ellipse mask. */
function CardDots({ className }: { className: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute -z-10 h-328.75 w-799.5 overflow-hidden mask-[url(/images/landing/glow-mask-card.svg)] mask-alpha mask-no-repeat mask-size-[100%_100%]",
        className,
      )}
    >
      <div className="absolute -top-134.75 left-48.5 h-559 w-815.75 bg-[url(/images/landing/dot-grid.svg)] bg-size-[100%_100%]" />
    </div>
  );
}

/** The soft lime wash every card carries, placed by the image's top-left corner. */
function CardGlow({ className }: { className: string }) {
  return (
    <img
      src="/images/landing/card-glow-lime.svg"
      alt=""
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute h-624.75 w-1066.5 max-w-none",
        className,
      )}
    />
  );
}

/** The diagonal line texture on the lime cards. */
function CardLines() {
  return (
    <img
      src="/images/landing/card-lines.svg"
      alt=""
      aria-hidden="true"
      className="pointer-events-none absolute -z-10 -top-95.25 -left-946 h-698.75 w-2399.5 max-w-none"
    />
  );
}

type CopyProps = {
  /** Position, in card units. */
  className: string;
  /** Colour for the whole block. */
  tone: string;
  title: string;
  titleClassName: string;
  body: string;
  /** Must carry the body's own `text-u-*`; the design sizes it per card. */
  bodyClassName: string;
};

function CardCopy({
  className,
  tone,
  title,
  titleClassName,
  body,
  bodyClassName,
}: CopyProps) {
  return (
    <div
      className={cn("absolute flex w-411.75 flex-col gap-8", tone, className)}
    >
      <h3 className={cn(TITLE, titleClassName)}>{title}</h3>
      <p className={cn(BODY, bodyClassName)}>{body}</p>
    </div>
  );
}

/** An asset chip on the Send card. NGN resolves to the naira flag, the rest to coins. */
function AssetChip({
  symbol,
  className,
}: {
  symbol: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center gap-13.25 rounded-u-166.75 border-u-1.75 border-jumpa-neutral-75 bg-jumpa-neutral-50 px-16.75 py-10 text-u-40/60 font-semibold tracking-jumpa text-jumpa-black",
        className,
      )}
    >
      <Image
        src={symbol === "NGN" ? FLAGS.NG : getAssetLogo(symbol)}
        alt=""
        width={128}
        height={128}
        className="size-36.75 shrink-0 rounded-full object-contain"
      />
      {symbol}
    </span>
  );
}

export function SendCard({ className, style }: CardProps) {
  return (
    <div className={cn(FRAME, className)} style={style}>
      <div className={cn(SURFACE, LIME)}>
        <CardLines />
        <CardGlow className="-z-10 -left-276.75 top-155.5 mix-blend-soft-light" />
        <CardCopy
          className="top-24.25 left-38.5"
          tone="text-jumpa-alt-950"
          title={SEND_CARD.title}
          titleClassName="text-u-91.5/106.5"
          body={SEND_CARD.description}
          bodyClassName="text-u-18.25/24.25"
        />
        <div className="absolute top-254 left-0 flex gap-13.75">
          {SEND_CARD.rows[0].map((symbol) => (
            <AssetChip key={symbol} symbol={symbol} />
          ))}
        </div>
        <div className="absolute top-361.25 -left-240.25 flex gap-13.75">
          {SEND_CARD.rows[1].map((symbol) => (
            <AssetChip key={symbol} symbol={symbol} className="w-193.25" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function ReceiveCard({ className, style }: CardProps) {
  return (
    <div className={cn(FRAME, className)} style={style}>
      <div className={cn(SURFACE, PURPLE)}>
        <CardDots className="-left-149.25 -top-108.25" />
        <CardDots className="-left-150.25 top-279.75" />
        <CardGlow className="-z-10 -left-273.5 -top-345.5 mix-blend-plus-lighter" />
        <p className="absolute top-0 left-251.75 -translate-x-1/2 text-u-246.75/271.25 font-medium tracking-jumpa-display whitespace-nowrap text-jumpa-alt-400">
          {RECEIVE_CARD.amount}
        </p>
        <CardCopy
          className="top-279 left-40.5"
          tone="text-jumpa-white"
          title={RECEIVE_CARD.title}
          titleClassName="text-u-91.5/106.5"
          body={RECEIVE_CARD.description}
          bodyClassName="text-u-18.25/24.25"
        />
      </div>
    </div>
  );
}

type SwapLegProps = {
  label: string;
  amount: string;
  symbol: string;
  /** The design draws the inner glow on the top leg only. */
  glow?: boolean;
};

function SwapLeg({ label, amount, symbol, glow }: SwapLegProps) {
  return (
    <div
      className={cn(
        "relative h-99.25 w-full rounded-u-16.25 bg-jumpa-white/37 backdrop-blur-u-6.25",
        glow && "inset-shadow-landing-row",
      )}
    >
      <div className="absolute top-21.25 left-20.25 flex w-369 items-center justify-between">
        <span className="flex flex-col gap-4">
          <span className="text-u-16.25/16.25 font-medium text-jumpa-primary-50">
            {label}
          </span>
          <span className="text-u-36.5/36.5 font-bold text-jumpa-white">
            {amount}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-8 rounded-u-101.5 border-u-1 border-jumpa-neutral-75 bg-jumpa-neutral-50 px-10.25 py-6 text-u-24.25/36.5 font-semibold tracking-jumpa text-jumpa-black">
          <Image
            src={getAssetLogo(symbol)}
            alt=""
            width={128}
            height={128}
            className="size-22.25 shrink-0 rounded-full object-contain"
          />
          {symbol}
        </span>
      </div>
    </div>
  );
}

export function SwapCard({ className, style }: CardProps) {
  return (
    <div className={cn(FRAME, className)} style={style}>
      <div className={cn(SURFACE, LIME)}>
        <CardLines />
        <CardCopy
          className="top-24.25 left-38.5"
          tone="text-jumpa-alt-950"
          title={SWAP_CARD.title}
          titleClassName="text-u-73.25/68.75"
          body={SWAP_CARD.description}
          bodyClassName="w-453.25 text-u-18.25/24.25 text-jumpa-black"
        />
        <div className="absolute top-254 left-1/2 flex w-453 -translate-x-1/2 flex-col gap-8 rounded-u-24.25 bg-jumpa-black/50 p-8">
          <CardGlow className="-left-289.25 -top-166 mix-blend-soft-light" />
          <SwapLeg
            label={SWAP_CARD.pay.label}
            amount={SWAP_CARD.pay.amount}
            symbol={SWAP_CARD.pay.symbol}
            glow
          />
          <SwapLeg
            label={SWAP_CARD.receive.label}
            amount={SWAP_CARD.receive.amount}
            symbol={SWAP_CARD.receive.symbol}
          />
          <span
            aria-hidden="true"
            className="absolute top-80 left-181.5 flex size-61.75 items-center justify-center rounded-full bg-jumpa-alt-400"
          >
            <ArrowDownArrowUpIcon className="size-24.25 rotate-180 text-jumpa-primary-600" />
          </span>
        </div>
      </div>
    </div>
  );
}

const PLAN_ICONS = [CircleUserIcon, LockIcon, UsersIcon];

/** The three savings rows, each a uniformly scaled copy of the one above it. */
const PLAN_ROWS = [
  {
    row: "z-3 -mb-18.25 w-451.5 gap-15 rounded-u-40.25 bg-jumpa-alt-450 p-20 shadow-ue-25.75/25",
    disc: "size-50.25 rounded-u-25",
    icon: "size-30",
    text: "gap-2.5",
    title: "text-u-17.5",
    body: "text-u-12.5/17.5",
  },
  {
    row: "z-2 -mb-18.25 w-full gap-12.5 rounded-u-33.25 bg-jumpa-primary-50 p-16.75 shadow-ue-25.75/25",
    disc: "size-41.5 rounded-u-20.75",
    icon: "size-25",
    text: "gap-2",
    title: "text-u-14.5",
    body: "text-u-10.5/14.5",
  },
  {
    row: "z-1 w-277 gap-9.25 rounded-u-24.75 bg-jumpa-primary-50 p-12.25",
    disc: "size-30.75 rounded-u-15.5",
    icon: "size-18.5",
    text: "gap-1.5",
    title: "text-u-10.75",
    body: "text-u-7.75/10.75",
  },
] as const;

export function SaveCard({ className, style }: CardProps) {
  return (
    <div className={cn(FRAME, className)} style={style}>
      <div className={cn(SURFACE, PURPLE)}>
        <CardDots className="-left-149.25 -top-108.25" />
        <CardDots className="-left-150.25 top-279.75" />
        <CardGlow className="-z-10 -left-273.75 -top-309 mix-blend-plus-lighter" />
        <div className="absolute top-73.25 left-1/2 flex w-374.5 -translate-x-1/2 flex-col items-center">
          {SAVE_CARD.plans.map((plan, index) => {
            const style = PLAN_ROWS[index];
            const Icon = PLAN_ICONS[index];
            return (
              <div
                key={plan.title}
                className={cn("relative flex items-center", style.row)}
              >
                <span
                  className={cn(
                    "flex shrink-0 items-center justify-center bg-jumpa-primary-950 text-jumpa-primary-50",
                    style.disc,
                  )}
                >
                  <Icon className={cn("shrink-0", style.icon)} />
                </span>
                <span className={cn("flex flex-col", style.text)}>
                  <span
                    className={cn(
                      "font-semibold tracking-jumpa text-jumpa-black",
                      style.title,
                    )}
                  >
                    {plan.title}
                  </span>
                  <span className={cn("text-jumpa-neutral-400", style.body)}>
                    {plan.description}
                  </span>
                </span>
              </div>
            );
          })}
        </div>
        <CardCopy
          className="top-277 left-46.5"
          tone="text-jumpa-white"
          title={SAVE_CARD.title}
          titleClassName="text-u-91.5/106.5"
          body={SAVE_CARD.description}
          bodyClassName="text-u-24.25/24.25"
        />
      </div>
    </div>
  );
}
