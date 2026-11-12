"use client";

import { type ReactNode, useState } from "react";
import { ActionGrid } from "@/components/home/action-grid";
import { BalancePanel, GLASS } from "@/components/home/balance-panel";
import { SoonFiatAccounts } from "@/components/home/fiat-accounts";
import { HomeSection } from "@/components/home/home-section";
import {
  PROMO_SLIDES,
  PromoBanner,
  type PromoSlide,
} from "@/components/home/promo-banner";
import { FieldError } from "@/components/ui/field-error";
import { RiseIn } from "@/components/ui/rise-in";
import { cn } from "@/lib/cn";
import { formatStable } from "@/lib/naira-deposit";
import type { AccountSummary } from "@/lib/nimiq/orders";
import { MINI_APP_CHAT_HREF, MINI_APP_PATH } from "@/lib/nimiq/views";
import {
  MINI_APP_ACTIONS,
  MINI_APP_PILLS,
  MINI_APP_RECEIVE_OPTIONS,
  MINI_APP_SEND_OPTIONS,
} from "./mini-app-actions";
import { NimiqHeader } from "./nimiq-header";

/** The main app's ads, pointed at mini-app screens; what works here leads. */
const SLIDES: PromoSlide[] = [
  { ...PROMO_SLIDES.airtime, href: `${MINI_APP_PATH}?view=airtime` },
  { ...PROMO_SLIDES.oneApp, href: MINI_APP_CHAT_HREF },
  // Savings is Soon here, so its ad only shows.
  { ...PROMO_SLIDES.savings, href: undefined },
];

/** Survives a trip into a flow and back; a fresh open shows the balance. */
let balanceHidden = false;

/** The mini app's home, laid out like the main app's: balance, accounts, shortcuts, activity. */
export function NimiqHome({
  address,
  account,
  accountError,
  onRefresh,
  onNavigate,
  onOpenMe,
  activity,
}: {
  address: string;
  account?: AccountSummary;
  accountError?: string;
  onRefresh: () => void;
  /** Pushes a mini-app href from a pill or tile. */
  onNavigate: (href: string) => void;
  onOpenMe: () => void;
  /** Orders still moving and recent history, under the shortcuts. */
  activity?: ReactNode;
}) {
  const [visible, setVisible] = useState(!balanceHidden);

  return (
    <div className="flex flex-col px-4.5 pt-[calc(env(safe-area-inset-top)+1rem)] pb-6">
      <NimiqHeader address={address} onOpenMe={onOpenMe} />

      <div className="mt-3.75">
        <BalancePanel
          balance={account ? formatStable(account.usdtBalance) : "—"}
          visible={visible}
          onToggleVisible={() => {
            balanceHidden = visible;
            setVisible(!visible);
          }}
          chip={<BalanceChip />}
          pills={MINI_APP_PILLS}
          sendOptions={MINI_APP_SEND_OPTIONS}
          receiveOptions={MINI_APP_RECEIVE_OPTIONS}
          onRefresh={onRefresh}
          onNavigate={onNavigate}
        />
      </div>

      {accountError ? (
        <div className="mt-3">
          <FieldError>{accountError}</FieldError>
        </div>
      ) : null}

      <RiseIn index={0} className="mt-5.5">
        <SoonFiatAccounts />
      </RiseIn>

      <RiseIn index={1} className="mt-1.25">
        <PromoBanner slides={SLIDES} onNavigate={onNavigate} />
      </RiseIn>

      <RiseIn index={2} className="mt-1.5">
        <HomeSection title="Quick Actions" className="gap-2.5">
          <ActionGrid actions={MINI_APP_ACTIONS} onNavigate={onNavigate} />
        </HomeSection>
      </RiseIn>

      <RiseIn index={3} className="mt-5.25 flex flex-col gap-5.25">
        {activity}
      </RiseIn>
    </div>
  );
}

/** Where the Balance Details chip sits on the main card; no breakdown until a second chain is counted. */
function BalanceChip() {
  return (
    <span
      className={cn(
        "flex h-7 w-fit items-center rounded-pill px-3 text-xs leading-2.5 font-medium tracking-jumpa-snug text-jumpa-white",
        GLASS,
      )}
    >
      Balance
    </span>
  );
}
