"use client";

import Image from "next/image";
import Link from "next/link";
import { type ReactNode, useState } from "react";
import { ReceiveOptionsSheet } from "@/components/transfer/receive-options-sheet";
import { SendOptionsSheet } from "@/components/transfer/send-options-sheet";
import { ChevronDownIcon } from "@/components/ui/icons/chevron-down";
import { EyeIcon } from "@/components/ui/icons/eye";
import { EyeOffIcon } from "@/components/ui/icons/eye-off";
import { RefreshCwIcon } from "@/components/ui/icons/refresh-cw";
import { SOON, SoonTag } from "@/components/ui/soon-tag";
import { invalidateClientBalances } from "@/lib/client-events";
import { cn } from "@/lib/cn";
import { APP_ACTIONS, type AppAction, type AppActionId } from "./actions";
import { BalanceSheet } from "./balance-sheet";

/** Stands in for the digits while the balance is hidden. */
const MASK = "*".repeat(6);

/** Frosted chip over the purple card. */
export const GLASS = "bg-jumpa-white/5 inset-ring inset-ring-jumpa-white/35";

const PILL =
  "flex h-11.5 items-center justify-center gap-0.5 rounded-pill bg-jumpa-neutral-95/20 text-sm shadow-jumpa-glass leading-none font-medium tracking-jumpa-snug text-jumpa-violet-950";

type Sheet = "details" | "send" | "receive" | null;

/** The pills under the card; widths follow the design's, so the row fills the card at any size. */
const PILLS: AppActionId[] = ["send", "deposit", "swap", "qr"];
const HOME_PILLS = PILLS.map((id) => APP_ACTIONS[id]);

interface BalancePanelProps {
  balance: string;
  savingsBalance?: string;
  savingsNgnBalance?: string;
  visible?: boolean;
  onToggleVisible?: () => void;
  /** Replaces the Balance Details chip, for a card with no breakdown behind it. */
  chip?: ReactNode;
  /** The four pills under the card; Home's by default. */
  pills?: AppAction[];
  /** Runs on refresh instead of re-reading every client balance. */
  onRefresh?: () => void;
  /** Takes over route pills, for a host that keeps its own navigation stack. */
  onNavigate?: (href: string) => void;
}

/**
 * Total balance on the purple card, then the transfer pills. The eye masks the
 * amount, the pill opens the breakdown, and Send and Deposit raise their
 * chooser rather than navigating.
 */
export function BalancePanel({
  balance,
  savingsBalance,
  savingsNgnBalance,
  visible: controlledVisible,
  onToggleVisible,
  chip,
  pills = HOME_PILLS,
  onRefresh = invalidateClientBalances,
  onNavigate,
}: BalancePanelProps) {
  const [internalVisible, setInternalVisible] = useState(false);
  const visible = controlledVisible ?? internalVisible;
  const [sheet, setSheet] = useState<Sheet>(null);
  // Each tap adds a full turn, so the icon spins forward without snapping back.
  const [turns, setTurns] = useState(0);
  const ToggleIcon = visible ? EyeOffIcon : EyeIcon;

  const toggle = () => {
    if (onToggleVisible) onToggleVisible();
    else setInternalVisible((on) => !on);
  };

  return (
    <section className="flex flex-col gap-3.75">
      <div className="relative isolate h-27.25 overflow-hidden rounded-row bg-jumpa-primary-600">
        <BalanceCardArt />

        <div className="flex flex-col items-start gap-2.5 pt-4.75 pl-5">
          {chip ?? (
            <button
              type="button"
              onClick={() => setSheet("details")}
              aria-haspopup="dialog"
              aria-expanded={sheet === "details"}
              className={cn(
                "tap flex h-7 w-32.25 items-center justify-center gap-1.25 rounded-pill text-xs leading-2.5 font-medium tracking-jumpa-snug text-jumpa-white active:scale-95",
                GLASS,
              )}
            >
              Balance Details
              <ChevronDownIcon className="size-4" />
            </button>
          )}

          <p className="flex h-8.5 items-center gap-2 text-jumpa-white">
            <span className="leading-0 font-semibold tracking-jumpa-snug">
              {visible ? (
                <span className="text-xl leading-8.5 text-jumpa-alt-400">
                  $
                </span>
              ) : null}
              <span className="text-[32px] leading-8.5">
                {visible ? balance : MASK}
              </span>
            </span>
            <button
              type="button"
              onClick={toggle}
              aria-label={visible ? "Hide balance" : "Show balance"}
              className="tap active:scale-90"
            >
              <ToggleIcon className="size-6" />
            </button>
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setTurns((count) => count + 1);
            onRefresh();
          }}
          aria-label="Refresh balance"
          className={cn(
            "tap absolute top-4 right-4.25 flex size-8.25 items-center justify-center rounded-pill text-jumpa-white active:scale-95",
            GLASS,
          )}
        >
          <RefreshCwIcon
            style={{ transform: `rotate(${turns * 360}deg)` }}
            className="size-4.75 transition-transform duration-700 ease-jumpa"
          />
        </button>
      </div>

      <nav className="grid grid-cols-[79fr_95fr_83fr_72fr] gap-2.25">
        {pills.map(({ label, Icon, to, soon, flip }) => {
          const body = (
            <>
              <Icon
                className={cn(
                  "size-5.5 text-jumpa-primary-600",
                  flip && "-scale-y-100",
                )}
              />
              {label}
            </>
          );

          if (soon) {
            return (
              <span key={label} className="relative">
                <span aria-disabled="true" className={cn(PILL, SOON)}>
                  {body}
                  <span className="sr-only">(coming soon)</span>
                </span>
                <SoonTag className="-top-1 right-1" />
              </span>
            );
          }

          if ("sheet" in to) {
            return (
              <button
                key={label}
                type="button"
                onClick={() => setSheet(to.sheet)}
                aria-haspopup="dialog"
                aria-expanded={sheet === to.sheet}
                className={cn("tap active:scale-95", PILL)}
              >
                {body}
              </button>
            );
          }

          if (onNavigate) {
            return (
              <button
                key={label}
                type="button"
                onClick={() => onNavigate(to.href)}
                className={cn("tap active:scale-95", PILL)}
              >
                {body}
              </button>
            );
          }

          return (
            <Link
              key={label}
              prefetch
              href={to.href}
              className={cn("tap active:scale-95", PILL)}
            >
              {body}
            </Link>
          );
        })}
      </nav>

      {sheet === "details" ? (
        <BalanceSheet
          balance={balance}
          savingsBalance={savingsBalance}
          savingsNgnBalance={savingsNgnBalance}
          onClose={() => setSheet(null)}
        />
      ) : null}

      {sheet === "send" ? (
        <SendOptionsSheet onClose={() => setSheet(null)} />
      ) : null}

      {sheet === "receive" ? (
        <ReceiveOptionsSheet onClose={() => setSheet(null)} />
      ) : null}
    </section>
  );
}

/** Frosted swirls (pinned right) and the soft orb (pinned left) behind the balance. */
function BalanceCardArt() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-10"
    >
      <Image
        src="/images/home/card-swirl.svg"
        alt=""
        width={225}
        height={150}
        className="absolute top-0 -right-12 max-w-none -rotate-[8.67deg]"
      />
      <Image
        src="/images/home/card-swirl.svg"
        alt=""
        width={225}
        height={150}
        className="absolute top-6.25 -right-18 max-w-none rotate-[10.54deg]"
      />
      <Image
        src="/images/home/card-orb.svg"
        alt=""
        width={139}
        height={139}
        className="absolute top-3.25 -left-4.5 max-w-none -rotate-[41.32deg]"
      />
    </div>
  );
}
