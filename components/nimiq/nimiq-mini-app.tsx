"use client";

import { useEffect, useRef } from "react";
import type { Address } from "viem";
import { JumpaLoaderScreen } from "@/components/ui/jumpa-loader";
import type { NimiqLimits } from "@/lib/nimiq/config";
import { visibleHistory } from "@/lib/nimiq/history";
import { isInFlight, type NimiqDirection } from "@/lib/nimiq/order-status";
import type { Eip1193 } from "@/lib/nimiq/provider";
import {
  type FlowName,
  MINI_APP_CHAT_HREF,
  MINI_APP_PATH,
  MINI_APP_TAB_HREF,
  tabHrefOf,
} from "@/lib/nimiq/views";
import { BillFlow } from "./bill-flow";
import { CashOutFlow } from "./cash-out-flow";
import { ConnectWallet } from "./connect-wallet";
import { InProgressOrders } from "./in-progress-orders";
import { MiniAppTabBar } from "./mini-app-tab-bar";
import { NimiqChat } from "./nimiq-chat";
import { NimiqHistory } from "./nimiq-history";
import { NimiqHome } from "./nimiq-home";
import { NimiqMe } from "./nimiq-me";
import { NimiqOrderView } from "./nimiq-order-view";
import { OpenInNimiq } from "./open-in-nimiq";
import { RecentActivity } from "./recent-activity";
import { TopUpFlow } from "./top-up-flow";
import { useBalanceMoves } from "./use-balance-moves";
import { holdChatPrefill } from "./use-chat-prefill";
import { useMiniAppNav } from "./use-mini-app-nav";
import { useNimiqAccount } from "./use-nimiq-account";
import { useNimiqWallet } from "./use-nimiq-wallet";
import { useOrderHistory } from "./use-order-history";
import { useRecentOrders } from "./use-recent-orders";
import { useSavedRecipients } from "./use-saved-recipients";

/** The screen that starts a fresh order of each kind. */
const FLOW_OF: Record<NimiqDirection, FlowName> = {
  cash_out: "cash-out",
  top_up: "top-up",
  airtime: "airtime",
  data: "data",
};

/** Settled orders previewed on home; the rest are a tap on See All away. */
const HOME_HISTORY_ROWS = 3;

/** Picks the screen: outside Nimiq Pay, connect, or the app itself. */
export function NimiqMiniApp({ limits }: { limits: NimiqLimits }) {
  const wallet = useNimiqWallet();

  switch (wallet.state) {
    case "detecting":
      return <JumpaLoaderScreen label="Opening Jumpa" />;
    case "outside":
      return <OpenInNimiq dailyUsd={limits.dailyUsd} />;
    case "disconnected":
      return (
        <ConnectWallet
          connecting={wallet.connecting}
          error={wallet.error}
          onConnect={wallet.connect}
        />
      );
    case "connected":
      return (
        <ConnectedApp provider={wallet.provider} address={wallet.address} />
      );
  }
}

function ConnectedApp({
  provider,
  address,
}: {
  provider: Eip1193;
  address: Address;
}) {
  const nav = useMiniAppNav();
  const account = useNimiqAccount(address);
  const recent = useRecentOrders(address);
  const saved = useSavedRecipients(address);
  const balanceMoves = useBalanceMoves();
  const { view } = nav;
  const { refresh, refreshUntilChanged } = account;
  const { take: tookBalanceMove } = balanceMoves;
  const tabHref = tabHrefOf(view);
  // Re-read on every return to home or history, so statuses are current.
  const history = useOrderHistory(
    recent.ids,
    view.name === "home" || view.name === "history",
    recent.forget,
  );
  const listed = history.orders && visibleHistory(history.orders);

  // Back on a tab after a flow: the balance and today's limit may have moved.
  const lastView = useRef(view.name);
  useEffect(() => {
    if (tabHref && view.name !== lastView.current) {
      // A finished order can reach the chain a few seconds after it says done.
      if (tookBalanceMove()) void refreshUntilChanged();
      else refresh();
    }
    lastView.current = view.name;
  }, [view.name, tabHref, refresh, refreshUntilChanged, tookBalanceMove]);

  const openFromHistory = (orderId: string) =>
    nav.openOrder(orderId, { fromHistory: true });

  switch (view.name) {
    case "chat":
      return (
        <NimiqChat
          address={address}
          onClose={nav.back}
          onHandoff={(handoff) => {
            holdChatPrefill(handoff);
            nav.go(
              handoff.flow === "history"
                ? MINI_APP_TAB_HREF.history
                : `${MINI_APP_PATH}?view=${handoff.flow}`,
            );
          }}
        />
      );
    case "cash-out":
      return (
        <CashOutFlow
          provider={provider}
          address={address}
          account={account.account}
          savedBanks={saved.banks}
          onLeave={nav.back}
          onOrderCreated={recent.remember}
          onSubmitted={(order, bank) => {
            saved.saveBank(bank);
            balanceMoves.note(order, true);
            nav.showOrder(order.id);
          }}
        />
      );
    case "airtime":
    case "data":
      return (
        <BillFlow
          key={view.name}
          kind={view.name}
          provider={provider}
          address={address}
          account={account.account}
          onLeave={nav.back}
          onOrderCreated={recent.remember}
          onSubmitted={(order) => {
            balanceMoves.note(order, true);
            nav.showOrder(order.id);
          }}
        />
      );
    case "top-up":
      return (
        <TopUpFlow
          address={address}
          account={account.account}
          savedWallets={saved.wallets}
          onLeave={nav.back}
          onCreated={(order, recipient) => {
            recent.remember(order.id);
            if (recipient) saved.saveWallet(recipient);
            balanceMoves.note(order, true);
            nav.showOrder(order.id);
          }}
        />
      );
    case "order":
      return (
        <NimiqOrderView
          orderId={view.orderId}
          onHome={nav.back}
          backLabel={view.fromHistory ? "Back to history" : "Back to home"}
          onRetry={(direction) => nav.restart(FLOW_OF[direction])}
          onMissing={recent.forget}
          onUpdate={balanceMoves.note}
        />
      );
    case "history":
    case "me":
    case "home":
      return (
        <>
          {renderTab(view.name)}
          <MiniAppTabBar
            current={tabHref ?? MINI_APP_TAB_HREF.home}
            // Chat opens above the tabs, so Back returns to the tab it came from.
            onNavigate={(href) =>
              href === MINI_APP_CHAT_HREF ? nav.go(href) : nav.tab(href)
            }
          />
        </>
      );
  }

  function renderTab(tab: "home" | "history" | "me") {
    switch (tab) {
      case "history":
        return (
          <NimiqHistory
            orders={listed}
            error={history.error}
            onRetry={history.reload}
            onBack={nav.back}
            onOpen={openFromHistory}
          />
        );
      case "me":
        return (
          <NimiqMe
            address={address}
            account={account.account}
            onBack={nav.back}
          />
        );
      case "home": {
        const moving = history.orders?.filter(isInFlight) ?? [];
        const settled = listed?.filter((order) => !isInFlight(order));
        return (
          <NimiqHome
            address={address}
            account={account.account}
            accountError={account.error}
            onRefresh={refresh}
            onNavigate={nav.go}
            onOpenMe={() => nav.tab(MINI_APP_TAB_HREF.me)}
            activity={
              <>
                <InProgressOrders orders={moving} onOpen={nav.openOrder} />
                {/* Hidden while the only orders are still moving; they show above. */}
                {settled?.length || !moving.length ? (
                  <RecentActivity
                    orders={settled?.slice(0, HOME_HISTORY_ROWS)}
                    error={history.error}
                    onRetry={history.reload}
                    onOpen={openFromHistory}
                    onSeeAll={() => nav.tab(MINI_APP_TAB_HREF.history)}
                  />
                ) : null}
              </>
            }
          />
        );
      }
    }
  }
}
