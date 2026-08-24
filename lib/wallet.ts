export interface UserAccountInfo {
  firstName: string;
  avatar: string;
  verified: boolean;
  balance: string;
  kyc: { completed: number; total: number };
}

export const ACCOUNT: UserAccountInfo = {
  firstName: "User",
  avatar: "/images/home/avatar-illustration.webp",
  verified: true,
  balance: "0.00",
  kyc: { completed: 4, total: 5 },
};

export type Asset = {
  symbol: string;
  name: string;
  icon: string;
  balance: string;
  change: string;
};

export const ASSETS: Asset[] = [
  {
    symbol: "XLM",
    name: "Stellar",
    icon: "/images/home/coin-generic.svg",
    balance: "$0.00",
    change: "+$0.00",
  },
  {
    symbol: "USDC",
    name: "USD Coin",
    icon: "/images/home/usdcImg.png",
    balance: "$0.00",
    change: "+$0.00",
  },
  {
    symbol: "USDT",
    name: "Tether",
    icon: "/coins/usdt.svg",
    balance: "$0.00",
    change: "+$0.00",
  },
];

export type TransactionStatus = "completed" | "pending" | "failed";

/** Picks the glyph on the row's tile. */
export type TransactionKind = "send" | "receive" | "card";

export type Transaction = {
  id: string;
  kind: TransactionKind;
  title: string;
  /** Counterparty and time, pre-joined: "To 0x82...4F2A • Today, 2:34 PM". */
  detail: string;
  amount: string;
  status: TransactionStatus;
  /** Network badge on the tile; omit for none. */
  chain?: string;
};

export const TRANSACTIONS: Transaction[] = [];

export type Promotion = {
  id: string;
  tone: "lime" | "purple";
  title: string;
  highlight: string;
  brand: string;
  description: string;
  href: string;
};

export const PROMOTIONS: Promotion[] = [
  {
    id: "zero-fees-lime",
    tone: "lime",
    highlight: "0%",
    title: " Transfer Charges with ",
    brand: "Jumpa",
    description: "Move your money freely with Jumpa.",
    href: "/home",
  },
  {
    id: "zero-fees-purple",
    tone: "purple",
    highlight: "0%",
    title: " Transfer Charges with ",
    brand: "Jumpa",
    description: "Move your money freely with Jumpa.",
    href: "/home",
  },
];
