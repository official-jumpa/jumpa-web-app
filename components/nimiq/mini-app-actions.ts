import { APP_ACTIONS, type AppAction } from "@/components/home/actions";
import { APP_TABS } from "@/components/home/bottom-nav";
import type { NavTab } from "@/components/home/tab-bar";
import { MINI_APP_PATH, MINI_APP_TAB_HREF } from "@/lib/nimiq/views";

/** The main app's shortcuts, pointed at mini-app screens; anything the mini app can't do yet is Soon. */

/** Under the balance card: the two flows in Send and Deposit's places, then Swap and QR. */
export const MINI_APP_PILLS: AppAction[] = [
  {
    ...APP_ACTIONS.deposit,
    label: "Top up",
    to: { href: `${MINI_APP_PATH}?view=top-up` },
  },
  {
    ...APP_ACTIONS.send,
    label: "Cash out",
    to: { href: `${MINI_APP_PATH}?view=cash-out` },
  },
  { ...APP_ACTIONS.swap, soon: true },
  APP_ACTIONS.qr,
];

/** Home's Quick Actions grid, in the main app's order. */
export const MINI_APP_ACTIONS: AppAction[] = [
  { ...APP_ACTIONS.savings, soon: true },
  { ...APP_ACTIONS.invest, soon: true },
  { ...APP_ACTIONS.data, soon: true },
  { ...APP_ACTIONS.airtime, soon: true },
  { ...APP_ACTIONS.history, to: { href: MINI_APP_TAB_HREF.history } },
  { ...APP_ACTIONS.bill, soon: true },
  { ...APP_ACTIONS.lending, soon: true },
  {
    ...APP_ACTIONS.wallets,
    label: "Wallet",
    to: { href: MINI_APP_TAB_HREF.me },
  },
];

/** The main app's tabs; Cards stays Soon. */
export const MINI_APP_TABS: NavTab[] = [
  { ...APP_TABS.home, href: MINI_APP_TAB_HREF.home },
  APP_TABS.cards,
  { ...APP_TABS.txn, href: MINI_APP_TAB_HREF.history },
  { ...APP_TABS.me, href: MINI_APP_TAB_HREF.me },
];
