import { APP_ACTIONS, type AppAction } from "@/components/home/actions";
import { APP_TABS } from "@/components/home/bottom-nav";
import type { NavTab } from "@/components/home/tab-bar";
import {
  RECEIVE_OPTIONS,
  type ReceiveOption,
} from "@/components/transfer/receive-options";
import {
  SEND_OPTIONS,
  type SendOption,
} from "@/components/transfer/send-options";
import { MINI_APP_PATH, MINI_APP_TAB_HREF } from "@/lib/nimiq/views";

/** The main app's shortcuts, pointed at mini-app screens; anything the mini app can't do yet is Soon. */

/** Under the balance card, as in the main app: Send and Deposit raise their sheets. */
export const MINI_APP_PILLS: AppAction[] = [
  APP_ACTIONS.send,
  APP_ACTIONS.deposit,
  { ...APP_ACTIONS.swap, soon: true },
  APP_ACTIONS.qr,
];

const sendOption = (id: string) =>
  SEND_OPTIONS.find((option) => option.id === id) as SendOption;

/** The Send sheet: Polygon addresses and banks work; the rest need a Jumpa account. */
export const MINI_APP_SEND_OPTIONS: SendOption[] = [
  {
    ...sendOption("address"),
    caption: "Polygon",
    href: `${MINI_APP_PATH}?view=send`,
  },
  { ...sendOption("bank"), href: `${MINI_APP_PATH}?view=cash-out` },
  { ...sendOption("jumpa"), soon: true },
  {
    ...sendOption("address"),
    id: "other-networks",
    title: "Other networks",
    caption: "Stellar, Solana, Base",
    soon: true,
  },
];

/** The Deposit sheet: Naira by bank transfer, or USDT on Polygon straight to this wallet. */
export const MINI_APP_RECEIVE_OPTIONS: ReceiveOption[] = RECEIVE_OPTIONS.map(
  (option) => ({
    ...option,
    href: `${MINI_APP_PATH}?view=${option.id === "fiat" ? "top-up" : "receive"}`,
  }),
);

/** Home's Quick Actions grid, in the main app's order; History takes More's place. */
export const MINI_APP_ACTIONS: AppAction[] = [
  { ...APP_ACTIONS.savings, soon: true },
  { ...APP_ACTIONS.invest, soon: true },
  { ...APP_ACTIONS.data, to: { href: `${MINI_APP_PATH}?view=data` } },
  { ...APP_ACTIONS.airtime, to: { href: `${MINI_APP_PATH}?view=airtime` } },
  // Referrals need a Jumpa account.
  { ...APP_ACTIONS.referral, soon: true },
  { ...APP_ACTIONS.bill, soon: true },
  { ...APP_ACTIONS.lending, soon: true },
  { ...APP_ACTIONS.history, to: { href: MINI_APP_TAB_HREF.history } },
];

/** The main app's tabs; Cards stays Soon. */
export const MINI_APP_TABS: NavTab[] = [
  { ...APP_TABS.home, href: MINI_APP_TAB_HREF.home },
  APP_TABS.cards,
  { ...APP_TABS.txn, href: MINI_APP_TAB_HREF.history },
  { ...APP_TABS.me, href: MINI_APP_TAB_HREF.me },
];
