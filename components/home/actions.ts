import type { ComponentType, SVGProps } from "react";
import { AccountGroupIcon } from "@/components/ui/icons/account-group";
import { ArrowDownRightAltIcon } from "@/components/ui/icons/arrow-down-right-alt";
import { ArrowSortIcon } from "@/components/ui/icons/arrow-sort";
import { ArrowTrendUpIcon } from "@/components/ui/icons/arrow-trend-up";
import { ArrowsExchangeIcon } from "@/components/ui/icons/arrows-exchange";
import { BankIcon } from "@/components/ui/icons/bank";
import { CreditCardNavIcon } from "@/components/ui/icons/credit-card-nav";
import { EllipsisCircleIcon } from "@/components/ui/icons/ellipsis-circle";
import { GiveStarIcon } from "@/components/ui/icons/give-star";
import { HeadsetIcon } from "@/components/ui/icons/headset";
import { MoneyBillWaveIcon } from "@/components/ui/icons/money-bill-wave";
import { PhoneAltIcon } from "@/components/ui/icons/phone-alt";
import { PiggyBankIcon } from "@/components/ui/icons/piggy-bank";
import { QrCodeAltIcon } from "@/components/ui/icons/qr-code-alt";
import { ReceiptAltIcon } from "@/components/ui/icons/receipt-alt";
import { WalletIcon } from "@/components/ui/icons/wallet";

export type AppAction = {
  label: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
  /** Sizes the glyph inside its 44px disc, as the design draws each one. */
  iconSize: string;
  /** A route, or the chooser sheet the tile raises instead. */
  to: { href: string } | { sheet: "send" | "receive" };
  /** Mutes the tile and tags it "Soon" — drop it to go live. */
  soon?: boolean;
  /** Mirrors the glyph vertically (Send reuses Deposit's arrow). */
  flip?: boolean;
};

const ACTIONS = {
  send: {
    label: "Send",
    Icon: ArrowDownRightAltIcon,
    iconSize: "size-5.5",
    to: { sheet: "send" },
    flip: true,
  },
  deposit: {
    label: "Deposit",
    Icon: ArrowDownRightAltIcon,
    iconSize: "size-5.5",
    to: { sheet: "receive" },
  },
  swap: {
    label: "Swap",
    Icon: ArrowsExchangeIcon,
    iconSize: "size-5.5",
    to: { href: "/swap" },
  },
  qr: {
    label: "QR",
    Icon: QrCodeAltIcon,
    iconSize: "size-5.5",
    to: { href: "/send/scan" },
    soon: true,
  },
  savings: {
    label: "Savings",
    Icon: PiggyBankIcon,
    iconSize: "size-6",
    to: { href: "/savings" },
  },
  invest: {
    label: "Invest",
    Icon: ArrowTrendUpIcon,
    iconSize: "w-4.5",
    to: { href: "/invest" },
    soon: true,
  },
  data: {
    label: "Data",
    Icon: ArrowSortIcon,
    iconSize: "size-5",
    to: { href: "/data" },
  },
  airtime: {
    label: "Airtime",
    Icon: PhoneAltIcon,
    iconSize: "size-6",
    to: { href: "/airtime" },
  },
  referral: {
    label: "Referral",
    Icon: AccountGroupIcon,
    iconSize: "size-5",
    to: { href: "/referrals" },
  },
  bill: {
    label: "Bill",
    Icon: MoneyBillWaveIcon,
    iconSize: "w-5.5",
    to: { href: "/more" },
    soon: true,
  },
  lending: {
    label: "Lending",
    Icon: GiveStarIcon,
    iconSize: "size-4.75",
    to: { href: "/more" },
    soon: true,
  },
  more: {
    label: "More",
    Icon: EllipsisCircleIcon,
    iconSize: "size-6",
    to: { href: "/more" },
  },
  accounts: {
    label: "Accounts",
    Icon: BankIcon,
    iconSize: "size-5.5",
    to: { href: "/accounts" },
  },
  wallets: {
    label: "Wallets",
    Icon: WalletIcon,
    iconSize: "size-5.5",
    to: { href: "/assets" },
  },
  cards: {
    label: "Cards",
    Icon: CreditCardNavIcon,
    iconSize: "size-5.5",
    to: { href: "/cards" },
    soon: true,
  },
  history: {
    label: "History",
    Icon: ReceiptAltIcon,
    iconSize: "size-5.5",
    to: { href: "/transactions" },
  },
  support: {
    label: "Support",
    Icon: HeadsetIcon,
    iconSize: "size-5.5",
    to: { href: "/support" },
  },
} satisfies Record<string, AppAction>;

export type AppActionId = keyof typeof ACTIONS;

/** Every shortcut in the app, defined once; Home and More each pick from here. */
export const APP_ACTIONS: Record<AppActionId, AppAction> = ACTIONS;
