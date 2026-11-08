"use client";

import { useEffect, useRef } from "react";
import type { Address } from "viem";
import { JumpaLoaderScreen } from "@/components/ui/jumpa-loader";
import type { NimiqLimits } from "@/lib/nimiq/config";
import { visibleHistory } from "@/lib/nimiq/history";
import { isInFlight } from "@/lib/nimiq/order-status";
import type { Eip1193 } from "@/lib/nimiq/provider";
import { CashOutFlow } from "./cash-out-flow";
import { ConnectWallet } from "./connect-wallet";
import { InProgressOrders } from "./in-progress-orders";
import { NimiqHistory } from "./nimiq-history";
import { NimiqHome } from "./nimiq-home";
import { NimiqOrderView } from "./nimiq-order-view";
import { OpenInNimiq } from "./open-in-nimiq";
import { RecentActivity } from "./recent-activity";
import { TopUpFlow } from "./top-up-flow";
import { useMiniAppNav } from "./use-mini-app-nav";
import { useNimiqAccount } from "./use-nimiq-account";
import { useNimiqWallet } from "./use-nimiq-wallet";
import { useOrderHistory } from "./use-order-history";
import { useRecentOrders } from "./use-recent-orders";
import { useSavedRecipients } from "./use-saved-recipients";

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
  const { view } = nav;
  const { refresh } = account;
  // Re-read on every return to home or history, so statuses are current.
  const history = useOrderHistory(
    recent.ids,
    view.name === "home" || view.name === "history",
    recent.forget,
  );
  const listed = history.orders && visibleHistory(history.orders);

  // Back on home after a flow: the balance and today's limit may have moved.
  const lastView = useRef(view.name);
  useEffect(() => {
    if (view.name === "home" && lastView.current !== "home") refresh();
    lastView.current = view.name;
  }, [view.name, refresh]);

  const openFromHistory = (orderId: string) =>
    nav.openOrder(orderId, { fromHistory: true });

  switch (view.name) {
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
          onRetry={(direction) =>
            nav.restart(direction === "cash_out" ? "cash-out" : "top-up")
          }
          onMissing={recent.forget}
        />
      );
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
    case "home": {
      const moving = history.orders?.filter(isInFlight) ?? [];
      const settled = listed?.filter((order) => !isInFlight(order));
      return (
        <NimiqHome
          address={address}
          account={account.account}
          accountError={account.error}
          loading={account.loading}
          onRefresh={refresh}
          onOpen={nav.open}
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
                  onSeeAll={() => nav.open("history")}
                />
              ) : null}
            </>
          }
        />
      );
    }
  }
}
